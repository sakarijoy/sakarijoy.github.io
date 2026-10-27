import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const countries = await readFile(new URL('../scripts/travel-countries.js', import.meta.url), 'utf8');
const source = await readFile(new URL('../scripts/travel.js', import.meta.url), 'utf8');
function node(extra = {}) {
  const events = new Map(), classes = new Set();
  return {
    value: '', hidden: false, textContent: '',
    addEventListener(type, listener) { events.set(type, listener); },
    emit(type) { events.get(type)?.(); },
    classList: { toggle(name, value) { if (value) classes.add(name); else classes.delete(name); }, contains(name) { return classes.has(name); }, remove(name) { classes.delete(name); } },
    append() {}, ...extra
  };
}
function harness({ plugin = true, leaflet = true } = {}) {
  const controls = Object.fromEntries(['travel-search', 'travel-year', 'travel-status', 'travel-map-status', 'travel-no-results', 'travel-reset', 'travel-fit'].map(id => [id, node()]));
  controls['travel-year'].options = [];
  controls['travel-year'].add = option => controls['travel-year'].options.push(option);
  const records = [
    ['长春', '2023', 'CN', '43.88', '125.32'],
    ['东京一日', '2026', 'JP', '35.68', '139.76'],
    ['东京重游', '2026', 'JP', '35.68', '139.76'],
    ['待补充', 'undated', '', '', '']
  ].map(([title, year, country, lat, lng]) => {
    const button = node({ hidden: true });
    const link = node({ cloneNode() { return node(); } });
    return node({ button, dataset: { title, description: '旅行记录', place: title, year, country, lat, lng }, querySelector(selector) { return selector === 'button' ? button : link; } });
  });
  const pending = [], markers = [], views = [], fits = [];
  const map = { setView(...args) { views.push(args); return this; }, fitBounds(...args) { fits.push(args); }, closePopup() {} };
  const layer = { markers: [], addTo() { return this; }, clearLayers() { this.markers = []; }, addLayer(marker) { this.markers.push(marker); } };
  if (plugin) {
    layer.addLayers = values => layer.markers.push(...values);
    layer.zoomToShowLayer = (marker, callback) => pending.push({ marker, callback });
  }
  let clusterOptions;
  const L = {
    map: () => map,
    tileLayer: () => ({ addTo() { return this; }, on() {} }),
    layerGroup: () => layer,
    divIcon: options => options,
    marker(_point, options) {
      const marker = { options, opened: 0, bindPopup() { return this; }, bindTooltip() { return this; }, on() {}, openPopup() { this.opened++; } };
      markers.push(marker); return marker;
    }
  };
  if (plugin) L.markerClusterGroup = options => { clusterOptions = options; return layer; };
  const context = vm.createContext({
    document: { querySelector(selector) { return controls[selector.slice(1)] || { scrollIntoView() {} }; }, querySelectorAll: () => records, createElement: () => node() },
    window: { L: leaflet ? L : undefined, matchMedia: () => ({ matches: true }) }, L,
    Option: function (label, value) { this.label = label; this.value = value; }
  });
  vm.runInContext(countries, context); vm.runInContext(source, context);
  return { controls, records, pending, markers, layer, clusterOptions, views, fits };
}

test('cluster membership follows year/search filters, including zero matches and reset', () => {
  const ui = harness();
  assert.equal(ui.layer.markers.length, 3);
  assert.equal(ui.clusterOptions.showCoverageOnHover, false);
  assert.equal(ui.clusterOptions.spiderfyOnMaxZoom, true);
  assert.equal(ui.clusterOptions.spiderLegPolylineOptions.opacity, 0);
  assert.equal(ui.clusterOptions.animate, false);
  ui.controls['travel-year'].value = '2026'; ui.controls['travel-year'].emit('change');
  assert.equal(ui.layer.markers.length, 2);
  assert.equal(ui.records[0].hidden, true);
  ui.controls['travel-search'].value = '没有这个地点'; ui.controls['travel-search'].emit('input');
  assert.equal(ui.layer.markers.length, 0);
  assert.equal(ui.controls['travel-no-results'].hidden, false);
  ui.controls['travel-reset'].emit('click');
  assert.equal(ui.layer.markers.length, 3);
  assert.match(ui.controls['travel-status'].textContent, /4 篇游记 · 3 个点位/);
});

test('cluster badges expose the count and preserve country colors, using green for mixed groups', () => {
  const ui = harness();
  const badge = children => ui.clusterOptions.iconCreateFunction({ getChildCount: () => children.length, getAllChildMarkers: () => children }).html;
  assert.match(badge(ui.markers.slice(1)), /country-japan/);
  assert.match(badge(ui.markers.slice(1)), /2 个地点，点击展开/);
  assert.match(badge(ui.markers), /country-world/);
});

test('locating a clustered marker waits until it is visible; a later filter cancels a stale popup', () => {
  const ui = harness();
  ui.records[1].button.emit('click');
  assert.equal(ui.pending[0].marker, ui.markers[1]);
  assert.equal(ui.markers[1].opened, 0);
  ui.pending.shift().callback();
  assert.equal(ui.markers[1].opened, 1);
  ui.records[2].button.emit('click');
  ui.controls['travel-year'].value = '2023'; ui.controls['travel-year'].emit('change');
  ui.pending.shift().callback();
  assert.equal(ui.markers[2].opened, 0);
});

test('missing cluster plugin falls back to regular markers; missing Leaflet retains readable search results', () => {
  const fallback = harness({ plugin: false });
  assert.equal(fallback.layer.markers.length, 3);
  fallback.records[0].button.emit('click');
  assert.equal(fallback.markers[0].opened, 1);
  assert.match(fallback.controls['travel-map-status'].textContent, /聚合暂不可用/);
  const offline = harness({ leaflet: false });
  assert.equal(offline.controls['travel-fit'].disabled, true);
  offline.controls['travel-search'].value = '东京'; offline.controls['travel-search'].emit('input');
  assert.equal(offline.records.filter(record => !record.hidden).length, 2);
  assert.match(offline.controls['travel-map-status'].textContent, /地图组件未能加载/);
});
