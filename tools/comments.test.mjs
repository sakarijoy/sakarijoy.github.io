import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { validateCommentService } from './comment-config.mjs';

const source = await readFile(new URL('../scripts/comments.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));
function harness({ present = true, envId = 'https://comments.example/.netlify/functions/twikoo', commentPath = '/posts/Begining.html', init } = {}) {
  const status = { hidden: false, textContent: '' };
  const retry = { hidden: true, addEventListener(type, callback) { this.click = callback; } };
  const container = { replaceChildren() {} };
  const elements = { '[data-comments-status]': status, '[data-comments-retry]': retry, '[data-comments-container]': container };
  const attributes = {};
  const section = {
    dataset: { envId, clientVersion: '2.0.17', commentPath },
    querySelector: selector => elements[selector],
    setAttribute: (name, value) => { attributes[name] = value; }
  };
  const scripts = [];
  const timers = new Map();
  let timerId = 0;
  const window = init ? { twikoo: { init } } : {};
  const context = {
    URL, window,
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
    document: {
      querySelector: () => present ? section : null,
      createElement: () => ({ remove() { this.removed = true; } }),
      head: { append: script => scripts.push(script) }
    }
  };
  runInNewContext(source, context);
  return { status, retry, scripts, timers, attributes, window };
}

test('no comment section means no client request', async () => {
  const ui = harness({ present: false });
  await settle();
  assert.equal(ui.scripts.length, 0);
});

test('comments use the configured article identity', async () => {
  const requests = [];
  const ui = harness({ commentPath: '/posts/original-name.html', init: async options => { requests.push(options); } });
  await settle();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/posts/original-name.html');
  assert.equal(requests[0].envId, 'https://comments.example/.netlify/functions/twikoo');
  assert.equal(ui.status.hidden, true);
  assert.equal(ui.attributes['aria-busy'], 'false');
});

test('failed script loading exposes retry and can recover', async () => {
  const ui = harness();
  assert.equal(ui.scripts.length, 1);
  ui.scripts[0].onerror();
  await settle();
  assert.equal(ui.retry.hidden, false);
  assert.match(ui.status.textContent, /暂时无法加载/);
  assert.equal(ui.scripts[0].removed, true);
  const retryPromise = ui.retry.click();
  assert.equal(ui.scripts.length, 2);
  let mounted = 0;
  ui.window.twikoo = { init: async () => { mounted++; } };
  ui.scripts[1].onload();
  await retryPromise;
  assert.equal(mounted, 1);
  assert.equal(ui.retry.hidden, true);
  assert.equal(ui.status.hidden, true);
  assert.equal(ui.timers.size, 0);
});

test('an unresponsive client times out and enables retry', async () => {
  const ui = harness();
  [...ui.timers.values()][0]();
  await settle();
  assert.equal(ui.retry.hidden, false);
  assert.equal(ui.attributes['aria-busy'], 'false');
  assert.equal(ui.scripts[0].removed, true);
});

test('initialization failure is visible and concurrent retries do not duplicate mounts', async () => {
  let rejectInit, mounts = 0;
  const ui = harness({ init: () => { mounts++; return new Promise((resolve, reject) => { rejectInit = reject; }); } });
  await settle();
  await ui.retry.click();
  assert.equal(mounts, 1);
  rejectInit(new Error('Backend unavailable'));
  await settle();
  assert.equal(ui.retry.hidden, false);
});

test('invalid and secret-bearing endpoints are rejected before loading client', async () => {
  for (const envId of ['mongodb+srv://user:secret@cluster/twikoo', 'https://user:secret@comments.example', 'https://comments.example/?token=secret', 'http://comments.example']) {
    const ui = harness({ envId });
    await settle();
    assert.equal(ui.scripts.length, 0);
    assert.equal(ui.retry.hidden, false);
    assert.throws(() => validateCommentService({ enabled: true, envId, clientVersion: '2.0.17' }));
  }
  assert.doesNotThrow(() => validateCommentService({ enabled: true, envId: '', clientVersion: '2.0.17' }));
  assert.doesNotThrow(() => validateCommentService({ enabled: true, envId: 'https://comments.example/.netlify/functions/twikoo', clientVersion: '2.0.17' }));
});
