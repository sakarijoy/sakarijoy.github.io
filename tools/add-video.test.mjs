import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addVideo, parseArguments } from './add-video.mjs';
// Keep temporary imports independent of the CI build's CONTENT_DIR.
const importVideo = (options, root) => addVideo(options, root, join(root, 'content'));
async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), 'video-import-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'content/media'), { recursive: true });
  await writeFile(join(root, 'content-source.json'), JSON.stringify({ repository: 'test/content', branch: 'main', localDirectory: 'content' }));
  await writeFile(join(root, 'content/media/轨道.mp4'), 'test-media-bytes');
  return root;
}
const fields = { file: 'content/media/轨道.mp4', slug: 'guidao', title: '轨道', date: '2026-10-26' };
test('Chinese filenames in media remain intact and generate a draft by default', async t => {
  const root = await workspace(t);
  const result = await importVideo(fields, root);
  assert.equal(result.videoUrl, '/media/轨道.mp4'); assert.equal(result.published, false);
  const entry = await readFile(result.entryPath, 'utf8');
  assert.match(entry, /draft: true/); assert.match(entry, /title: "轨道"/);
  assert.equal(await readFile(join(root, 'content/media/轨道.mp4'), 'utf8'), 'test-media-bytes');
  await assert.rejects(stat(join(root, 'media')));
});
test('publishing is explicit and duplicate entries do not overwrite content', async t => {
  const root = await workspace(t);
  const first = await importVideo({ ...fields, publish: true, duration: '00:06' }, root);
  const before = await readFile(first.entryPath, 'utf8'); assert.match(before, /draft: false/);
  await assert.rejects(importVideo({ ...fields, title: 'changed' }, root), /同名/);
  assert.equal(await readFile(first.entryPath, 'utf8'), before);
});
test('external local video is copied and source retained; existing media is protected', async t => {
  const root = await workspace(t);
  await writeFile(join(root, 'source.mp4'), 'original');
  const result = await importVideo({ ...fields, file: 'source.mp4' }, root);
  assert.equal(result.videoUrl, '/media/guidao.mp4');
  assert.equal(await readFile(join(root, 'source.mp4'), 'utf8'), 'original');
  assert.equal(await readFile(join(root, 'content/media/guidao.mp4'), 'utf8'), 'original');
  await writeFile(join(root, 'content/media/taken.mp4'), 'keep');
  await assert.rejects(importVideo({ ...fields, file: 'source.mp4', slug: 'taken' }, root), /EEXIST/);
  assert.equal(await readFile(join(root, 'content/media/taken.mp4'), 'utf8'), 'keep');
});
test('invalid dates, unsafe slugs and missing or unsupported files are rejected', async t => {
  const root = await workspace(t);
  for (const options of [{ date: '2026-02-30' }, { slug: '../escape' }, { file: 'missing.mp4' }, { file: 'notes.txt' }, { duration: '1:99' }]) await assert.rejects(importVideo({ ...fields, ...options }, root));
  await assert.rejects(stat(join(root, 'content/videos/guidao.md')));
  assert.throws(() => parseArguments(['--file']), /缺少值/);
  assert.equal(parseArguments(['--publish']).publish, true);
});
