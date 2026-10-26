import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const source = await readFile(new URL('../scripts/video.js', import.meta.url), 'utf8');
function node(extra = {}) {
  const events = new Map();
  const attrs = new Map();
  return Object.assign({ hidden: false, value: '', children: [], options: [], textContent: '', dataset: {},
    addEventListener(type, callback) { if (!events.has(type)) events.set(type, []); events.get(type).push(callback); },
    async fire(type, event = {}) { for (const callback of events.get(type) || []) await callback(event); },
    add(option) { this.options.push(option); }, append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
    setAttribute(key, value) { attrs.set(key, value); }, hasAttribute(key) { return attrs.has(key); },
    removeAttribute(key) { attrs.delete(key); }, querySelector() { return null; }, querySelectorAll() { return []; },
    focus() { this.focused = true; }
  }, extra);
}
function setup({ populated = true, entry = false } = {}) {
  const search = node(), category = node(), year = node(), sort = node({ value: 'newest' });
  const status = node(), retry = node({ hidden: true }), video = node({ paused: true, loadCount: 0,
    pause() { this.paused = true; }, load() { this.loadCount++; },
    play() { this.paused = false; return Promise.resolve(); }
  });
  Object.defineProperty(video, 'src', { set(value) { this.setAttribute('src', value); }, get() { return this.hasAttribute('src') ? 'set' : ''; } });
  const section = node({ querySelector: key => ({ video, '[data-playback-status]': status, '[data-video-retry]': retry }[key]) });
  const dialog = Object.assign(section, { open: false, showModal() { this.open = true; }, close() { this.open = false; return this.fire('close'); } });
  const rows = [
    ['新旅行', '2026-01-01', '旅行影像', '福冈', '/media/first.mp4'],
    ['旧日常', '2025-01-02', '日常片段', '家里', '/media/second.mp4'],
    ['待补充', '2024-01-01', '日常片段', '家里', '']
  ];
  const cards = rows.map(([title, date, kind, place, url]) => {
    const trigger = node({ hidden: true }), link = node({ href: '/videos/' + date + '.html' });
    return node({ trigger, dataset: { title, date, category: kind, year: date.slice(0, 4), place, summary: '一段回忆', author: 'Sakari', videoUrl: url },
      querySelector: key => key === '[data-video-play]' ? trigger : link
    });
  });
  const grid = node({ querySelectorAll: () => cards, append(...items) { this.children = items; } });
  const form = node({ hidden: true }), results = node(), empty = node(), reset = node(), close = node();
  const heading = node(), summary = node(), detail = node(), original = node();
  const classes = new Set();
  const selectors = { '#video-grid': populated ? grid : null, '#video-search': search, '#video-category': category, '#video-year': year, '#video-sort': sort, '#video-filters': form, '#video-results': results, '#video-no-results': empty, '#video-dialog': dialog, '#video-dialog-title': heading, '#video-dialog-summary': summary, '#video-dialog-detail': detail, '#video-original': original, '#video-dialog-close': close };
  const document = { baseURI: 'http://localhost/video.html', body: { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } },
    querySelector: key => selectors[key] || null,
    querySelectorAll: key => key === '[data-video-player]' ? (populated || entry ? [section] : []) : [reset],
    createElement: () => node()
  };
  const sourceElement = node();
  if (entry) video.querySelector = key => key === 'source' ? sourceElement : null;
  runInNewContext(source, { document, URL, Option: function(text, value) { this.text = text; this.value = value; }, window: { addEventListener() {} } });
  return { cards, search, category, year, sort, grid, results, empty, reset, form, dialog, close, video, status, retry, classes, heading, original, sourceElement };
}
test('empty library initializes without requesting any video', () => {
  const ui = setup({ populated: false });
  assert.equal(ui.video.loadCount, 0); assert.equal(ui.video.hasAttribute('src'), false);
});
test('search, year and category combine; reset restores cards and date order', async () => {
  const ui = setup();
  assert.equal(ui.form.hidden, false);
  assert.equal(ui.results.textContent, '3 / 3 段影像');
  ui.search.value = 'ＳＡＫＡＲＩ 福冈'; await ui.search.fire('input');
  assert.deepEqual(ui.cards.map(card => card.hidden), [false, true, true]);
  ui.year.value = '2025'; await ui.year.fire('change');
  assert.equal(ui.empty.hidden, false);
  await ui.reset.fire('click');
  ui.category.value = '日常片段'; await ui.category.fire('change');
  assert.deepEqual(ui.cards.map(card => card.hidden), [true, false, false]);
  await ui.reset.fire('click');
  ui.sort.value = 'oldest'; await ui.sort.fire('change');
  assert.equal(ui.grid.children[0].dataset.title, '待补充');
  await ui.reset.fire('click');
  assert.equal(ui.grid.children[0].dataset.title, '新旅行');
  assert.equal(ui.empty.hidden, true);
});
test('opening a video sets metadata; closing stops playback, releases the source and restores focus', async () => {
  const ui = setup();
  await ui.cards[0].trigger.fire('click');
  assert.equal(ui.dialog.open, true); assert.equal(ui.video.paused, false);
  assert.equal(ui.heading.textContent, '新旅行');
  assert.equal(ui.original.href, 'http://localhost/media/first.mp4');
  assert.equal(ui.classes.has('video-modal-open'), true);
  await ui.close.fire('click');
  assert.equal(ui.dialog.open, false); assert.equal(ui.video.paused, true);
  assert.equal(ui.video.hasAttribute('src'), false);
  assert.equal(ui.classes.has('video-modal-open'), false);
  assert.equal(ui.cards[0].trigger.focused, true);
  assert.equal(ui.cards[2].trigger.hidden, true);
});
test('playback errors expose retry; a successful reload clears the error', async () => {
  const ui = setup();
  await ui.cards[0].trigger.fire('click');
  await ui.video.fire('error');
  assert.equal(ui.status.hidden, false); assert.equal(ui.retry.hidden, false);
  assert.match(ui.status.textContent, /无法播放/);
  await ui.retry.fire('click');
  assert.equal(ui.video.loadCount, 1);
  await ui.video.fire('playing');
  assert.equal(ui.status.hidden, true); assert.equal(ui.retry.hidden, true);
});
test('individual entry source failures offer the same recovery controls', async () => {
  const ui = setup({ populated: false, entry: true });
  await ui.sourceElement.fire('error');
  assert.equal(ui.status.hidden, false); assert.equal(ui.retry.hidden, false);
  await ui.retry.fire('click');
  await ui.video.fire('loadeddata');
  assert.equal(ui.status.hidden, true); assert.equal(ui.retry.hidden, true);
});
