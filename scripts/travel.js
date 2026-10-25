(() => {
  const search = document.querySelector('#travel-search');
  if (!search) return;
  const year = document.querySelector('#travel-year');
  const status = document.querySelector('#travel-status');
  const mapStatus = document.querySelector('#travel-map-status');
  const routeToggle = document.querySelector('#travel-route');
  const trips = [...document.querySelectorAll('[data-trip]')].map(el => {
    const lat = Number(el.dataset.lat), lng = Number(el.dataset.lng);
    const valid = el.dataset.lat.trim() !== '' && el.dataset.lng.trim() !== '' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const country = Object.hasOwn(countryStyles, el.dataset.country) ? countryStyles[el.dataset.country] : fallback;
    return { el, lat, lng, valid, country, marker: null };
  });
  [...new Set(trips.map(t => t.el.dataset.year))].sort().reverse().forEach(value => year.add(new Option(value === 'undated' ? '日期待补充' : value + ' 年', value)));
  let map, layer;
  if (window.L) {
    map = L.map('travel-map', { scrollWheelZoom: false }).setView([30, 105], 4);
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    tiles.on('tileerror', () => { mapStatus.textContent = '底图加载失败，请检查网络；地点列表仍可使用。'; });
    layer = L.layerGroup().addTo(map);
    trips.filter(t => t.valid).forEach(t => {
      const popup = document.createElement('div');
      const place = document.createElement('strong'); place.textContent = t.el.dataset.place || '旅行地点';
      const link = t.el.querySelector('h3 a').cloneNode(true);
      popup.append(place, document.createElement('br'), link);
      const icon = L.divIcon({ className: 'travel-country-marker', html: symbol(t.country), iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -15] });
      const placeLabel = t.el.dataset.place || t.el.dataset.title;
      const label = placeLabel.startsWith(t.country.name) ? placeLabel : t.country.name + ' · ' + placeLabel;
      const tooltip = document.createElement('span'); tooltip.textContent = label;
      t.marker = L.marker([t.lat, t.lng], { icon, title: label, alt: label }).bindPopup(popup).bindTooltip(tooltip, { direction: 'top', offset: [0, -14] });
      t.marker.on('click', () => {
        trips.forEach(other => other.el.classList.toggle('is-active', other === t));
      });
      const button = t.el.querySelector('button'); button.hidden = false;
      button.addEventListener('click', () => { map.setView([t.lat, t.lng], 12); t.marker.openPopup(); trips.forEach(other => other.el.classList.toggle('is-active', other === t)); document.querySelector('.travel-map-wrap').scrollIntoView({ block: 'start', behavior: 'auto' }); });
    });
  }
  const visible = () => trips.filter(t => !t.el.hidden);
  function fit() {
    const points = visible().filter(t => t.valid).map(t => [t.lat, t.lng]);
    if (!map) return;
    if (points.length) map.fitBounds(points, { padding: [45, 45], maxZoom: 12 });
    else map.setView([30, 105], 4);
  }
  function update() {
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    trips.forEach(t => {
      const text = [t.el.dataset.title, t.el.dataset.description, t.el.dataset.place].join(' ').toLocaleLowerCase();
      t.el.hidden = !words.every(word => text.includes(word)) || Boolean(year.value && t.el.dataset.year !== year.value);
      t.el.classList.remove('is-active');
    });
    const shown = visible(), located = shown.filter(t => t.valid);
    status.textContent = `${shown.length} 篇游记 · ${located.length} 个点位` + (shown.length > located.length ? ` · ${shown.length - located.length} 篇待补充坐标` : '');
    document.querySelector('#travel-no-results').hidden = !trips.length || shown.length > 0;
    if (map) {
      map.closePopup(); layer.clearLayers(); located.forEach(t => layer.addLayer(t.marker)); fit();
      if (routeToggle.checked) {
        const routes = new Map();
        located.filter(t => t.el.dataset.year !== 'undated').sort((a, b) => a.el.querySelector('time').dateTime.localeCompare(b.el.querySelector('time').dateTime)).forEach(t => {
          const key = t.el.dataset.year;
          if (!routes.has(key)) routes.set(key, []);
          routes.get(key).push([t.lat, t.lng]);
        });
        routes.forEach(points => {
          if (points.length > 1) L.polyline(points, { color: '#447c6a', weight: 3, opacity: 0.8, dashArray: '8 7', interactive: false }).addTo(layer);
        });
      }
      mapStatus.textContent = located.length ? (routeToggle.checked ? '虚线按日期连接同一年内的可见地点，表示到访顺序，不代表实际交通路线。' : '点击地图标记阅读游记；使用 + / − 缩放地图。') : '暂无可显示的点位，等待记录下一段旅程。';
    } else mapStatus.textContent = '地图组件未能加载，请检查网络并刷新；仍可搜索和阅读游记。';
  }
  search.addEventListener('input', update); year.addEventListener('change', update);
  routeToggle.addEventListener('change', update);
  document.querySelector('#travel-reset').addEventListener('click', () => { search.value = ''; year.value = ''; update(); });
  document.querySelector('#travel-fit').addEventListener('click', fit);
  document.querySelector('#travel-fit').disabled = !map;
  update();
})();
