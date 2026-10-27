import test from 'node:test';
import assert from 'node:assert/strict';
import { contentProblems, selectPublished, validateSite, absoluteUrl, indexablePages, groupByYear, entryNeighbors } from './content.mjs';
const entry = (title, date, contentType = 'article', extra = {}) => ({ inputPath: './src/' + title + '.md', url: '/' + title + '.html', date: new Date(date), data: { title, date, description: '一段记录', contentType, draft: false, ...extra } });
test('published collections exclude incomplete drafts, but reject quoted draft flags', () => {
  const published = entry('published', '2026-01-01');
  const draft = { data: { draft: true }, url: false };
  assert.deepEqual(selectPublished([draft, published]), [published]);
  assert.throws(() => selectPublished([entry('unsafe', '2026-01-01', 'article', { draft: 'true' })]), /不要加引号/);
});
test('invalid dates, missing summaries and duplicate output URLs fail before publication', () => {
  assert.throws(() => selectPublished([entry('invalid', '2026-02-30')]), /日期不存在/);
  assert.throws(() => selectPublished([entry('missing', '2026-01-01', 'article', { description: '' })]), /摘要/);
  const first = entry('same', '2026-01-01');
  assert.throws(() => selectPublished([first, { ...first }]), /网址重复/);
});
test('travel coordinates require a complete valid pair and permit zero', () => {
  assert.deepEqual(contentProblems(entry('equator', '2026-01-01', 'travel', { location: { latitude: 0, longitude: 0, countryCode: 'CN' } })), []);
  for (const location of [{ latitude: 31 }, { latitude: '31', longitude: 120 }, { latitude: 91, longitude: 120 }, { latitude: 31, longitude: 181 }]) assert.match(contentProblems(entry('invalid', '2026-01-01', 'travel', { location })).join(' '), /经纬度/);
  assert.deepEqual(contentProblems(entry('pending', '2026-01-01', 'travel', { location: { latitude: null, longitude: null } })), []);
});
test('resource metadata accepts local and HTTPS sources and refuses unsafe or incomplete values', () => {
  assert.deepEqual(contentProblems(entry('local', '2026-01-01', 'video', { videoUrl: '/media/轨道.mp4' })), []);
  assert.deepEqual(contentProblems(entry('remote', '2026-01-01', 'video', { videoUrl: 'https://example.com/film.mp4' })), []);
  for (const videoUrl of ['javascript:alert(1)', '//example.com/a.mp4', 'https://user:pass@example.com/a.mp4']) assert.match(contentProblems(entry('bad', '2026-01-01', 'video', { videoUrl })).join(' '), /HTTPS/);
  assert.match(contentProblems(entry('cover', '2026-01-01', 'article', { cover: '/images/cover.webp' })).join(' '), /coverAlt/);
});
test('site URL validates the domain and generates canonical home URLs', () => {
  const site = { url: 'https://example.com', title: '博客', description: '记录' };
  assert.doesNotThrow(() => validateSite(site));
  for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://example.com/?token=x']) assert.throws(() => validateSite({ ...site, url }));
  assert.equal(absoluteUrl('/index.html', site.url), 'https://example.com/');
  assert.equal(absoluteUrl('/posts/a.html', site.url), 'https://example.com/posts/a.html');
});
test('discovery excludes drafts, non-HTML resources and noindex pages', () => {
  const valid = entry('public', '2026-01-01');
  assert.equal(indexablePages([{ url: '/', data: {} }]).length, 1);
  assert.deepEqual(indexablePages([valid, entry('draft', '2026-01-01', 'article', { draft: true }), entry('404', '2026-01-01', 'article', { noindex: true }), { url: '/feed.xml', data: {} }, { url: false, data: {} }]), [valid]);
});
test('year groups and previous/next links derive only from the supplied public collection', () => {
  const newest = entry('new', '2026-10-01'), middle = entry('middle', '2026-01-01'), oldest = entry('old', '2023-01-01'), film = entry('film', '2026-05-01', 'video');
  const items = selectPublished([oldest, middle, film, newest]);
  assert.deepEqual(groupByYear(items).map(group => [group.year, group.entries.length]), [[2026, 3], [2023, 1]]);
  assert.equal(entryNeighbors(items, middle.url).previous, oldest);
  assert.equal(entryNeighbors(items, middle.url).next, newest);
  assert.deepEqual(entryNeighbors(items, film.url), { previous: undefined, next: undefined });
});
