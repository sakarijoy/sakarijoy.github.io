(() => {
  // Shared playback handling also runs on individual video entries.
  const players = [...document.querySelectorAll('[data-video-player]')];
  players.forEach(section => {
    const video = section.querySelector('video');
    const status = section.querySelector('[data-playback-status]');
    const retry = section.querySelector('[data-video-retry]');
    const hasSource = () => video.hasAttribute('src') || Boolean(video.querySelector('source'));
    const clear = () => { status.hidden = true; retry.hidden = true; };
    const failed = () => {
      if (!hasSource()) return;
      status.textContent = '视频暂时无法播放，请检查网络或尝试打开原视频文件。';
      status.hidden = false; retry.hidden = false;
    };
    video.addEventListener('error', failed);
    video.querySelector('source')?.addEventListener('error', failed);
    video.addEventListener('playing', clear);
    video.addEventListener('loadeddata', clear);
    video.addEventListener('waiting', () => {
      if (video.error) return;
      status.textContent = '正在缓冲，请稍候…'; status.hidden = false;
    });
    retry.addEventListener('click', () => {
      clear(); video.load();
      video.play().catch(error => {
        if (error.name === 'AbortError') return;
        if (error.name === 'NotAllowedError') {
          status.textContent = '视频已重新加载，请点击播放器中的播放按钮。'; status.hidden = false;
        } else failed();
      });
    });
  });
  const grid = document.querySelector('#video-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('[data-video-card]')];
  const search = document.querySelector('#video-search');
  const category = document.querySelector('#video-category');
  const year = document.querySelector('#video-year');
  const sort = document.querySelector('#video-sort');
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().trim();
  [...new Set(cards.map(card => card.dataset.category))].sort().forEach(value => category.add(new Option(value, value)));
  [...new Set(cards.map(card => card.dataset.year))].sort().reverse().forEach(value => year.add(new Option(value + ' 年', value)));
  function update() {
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    let count = 0;
    cards.forEach(card => {
      const text = normalize([card.dataset.title, card.dataset.summary, card.dataset.author, card.dataset.place, card.dataset.category].join(' '));
      card.hidden = !terms.every(term => text.includes(term)) || Boolean(category.value && card.dataset.category !== category.value) || Boolean(year.value && card.dataset.year !== year.value);
      if (!card.hidden) count++;
    });
    const ordered = [...cards].sort((a, b) => {
      const order = a.dataset.date.localeCompare(b.dataset.date) || a.dataset.title.localeCompare(b.dataset.title);
      return sort.value === 'oldest' ? order : -order;
    });
    grid.append(...ordered);
    document.querySelector('#video-results').textContent = count + ' / ' + cards.length + ' 段影像';
    document.querySelector('#video-no-results').hidden = count > 0;
  }
  function reset() { search.value = ''; category.value = ''; year.value = ''; sort.value = 'newest'; update(); }
  document.querySelector('#video-filters').hidden = false;
  document.querySelector('#video-filters').addEventListener('submit', event => event.preventDefault());
  search.addEventListener('input', update);
  [category, year, sort].forEach(field => field.addEventListener('change', update));
  document.querySelectorAll('#video-reset, [data-video-reset]').forEach(button => button.addEventListener('click', reset));
  update();
  const dialog = document.querySelector('#video-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const video = dialog.querySelector('video');
  const status = dialog.querySelector('[data-playback-status]');
  let lastTrigger;
  cards.forEach(card => {
    if (!card.dataset.videoUrl) return;
    const trigger = card.querySelector('[data-video-play]');
    trigger.hidden = false;
    trigger.addEventListener('click', () => {
      const url = new URL(card.dataset.videoUrl, document.baseURI);
      if (!['http:', 'https:'].includes(url.protocol)) return;
      lastTrigger = trigger;
      document.querySelector('#video-dialog-title').textContent = card.dataset.title;
      document.querySelector('#video-dialog-summary').textContent = card.dataset.summary;
      document.querySelector('#video-dialog-detail').href = card.querySelector('[data-video-detail]').href;
      document.querySelector('#video-original').href = url.href;
      status.hidden = true; dialog.querySelector('[data-video-retry]').hidden = true;
      if (card.dataset.poster) video.poster = card.dataset.poster;
      else video.removeAttribute('poster');
      video.setAttribute('aria-label', card.dataset.title);
      if (card.dataset.captions) {
        const track = document.createElement('track'); track.kind = 'captions'; track.label = '中文字幕'; track.srclang = 'zh'; track.src = card.dataset.captions; track.default = true; video.append(track);
      }
      video.src = url.href;
      dialog.showModal(); document.body.classList.add('video-modal-open');
      video.play().catch(error => {
        if (!dialog.open || error.name === 'AbortError' || video.error) return;
        status.textContent = '请点击播放器中的播放按钮开始观看。'; status.hidden = false;
      });
    });
  });
  document.querySelector('#video-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); });
  dialog.addEventListener('close', () => {
    video.pause(); video.removeAttribute('src'); video.replaceChildren(); video.load();
    document.body.classList.remove('video-modal-open');
    lastTrigger?.focus();
  });
  window.addEventListener('pagehide', () => video.pause());
})();
