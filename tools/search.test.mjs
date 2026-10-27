import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const source = await readFile(new URL('../scripts/search.js', import.meta.url), 'utf8');
function control(extra = {}) { return { value: '', hidden: false, textContent: '', events: {}, addEventListener(name, fn) { this.events[name] = fn; }, ...extra }; }
function harness(globalSearch = true) {
  const input = control({ focus() { this.focused = true; } }), clear = control(), status = control(), type = control(), empty = control();
  const cards = [control({ dataset: { searchText: '冲绳 日本 Sakari', contentType: 'travel' } }), control({ dataset: { searchText: '轨道 日常 Sakari', contentType: 'video' } })];
  const form = control({ dataset: { searchUnit: globalSearch ? '条记录' : undefined }, querySelector: key => ({ '[data-search-input]': input, '[data-search-clear]': clear, '[data-search-status]': status, '[data-search-type]': globalSearch ? type : null }[key]) });
  runInNewContext(source, { document: { querySelector: key => key === '[data-search-form]' ? form : empty, querySelectorAll: () => cards } });
  return { input, clear, status, type, empty, cards };
}
test('global search normalizes full-width text and combines all terms with content type', () => {
  const ui = harness(); ui.input.value = 'Ｓａｋａｒｉ 日本'; ui.input.events.input();
  assert.deepEqual(ui.cards.map(card => card.hidden), [false, true]);
  assert.equal(ui.status.textContent, '找到 1 条记录');
  ui.type.value = 'video'; ui.type.events.change(); assert.equal(ui.empty.hidden, false);
  ui.clear.events.click(); assert.deepEqual(ui.cards.map(card => card.hidden), [true, false]);
  assert.equal(ui.empty.hidden, true); assert.equal(ui.input.focused, true);
});
test('existing article search works without the new type selector', () => {
  const ui = harness(false); ui.input.value = '不存在'; ui.input.events.input();
  assert.equal(ui.empty.hidden, false); assert.equal(ui.status.textContent, '找到 0 篇文章');
  ui.clear.events.click(); assert.equal(ui.status.textContent, '共 2 篇文章'); assert.equal(ui.empty.hidden, true);
});
