(() => {
  const section = document.querySelector('[data-comments]');
  if (!section) return;
  const status = section.querySelector('[data-comments-status]');
  const container = section.querySelector('[data-comments-container]');
  const retry = section.querySelector('[data-comments-retry]');
  const envId = section.dataset.envId.trim();
  const version = section.dataset.clientVersion;
  const commentPath = section.dataset.commentPath;
  let busy = false;

  function loadClient() {
    if (window.twikoo?.init) return Promise.resolve(window.twikoo);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) { script.remove(); reject(error); }
        else resolve(window.twikoo);
      };
      const timer = setTimeout(() => finish(new Error('Comment client timed out')), 15000);
      script.src = 'https://cdn.jsdelivr.net/npm/twikoo@' + version + '/dist/twikoo.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => finish(window.twikoo?.init ? null : new Error('Comment client unavailable'));
      script.onerror = () => finish(new Error('Comment client failed to load'));
      document.head.append(script);
    });
  }

  async function start() {
    if (busy) return;
    busy = true;
    retry.hidden = true;
    status.hidden = false;
    status.textContent = '正在加载评论…';
    section.setAttribute('aria-busy', 'true');
    try {
      const endpoint = new URL(envId);
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
        throw new Error('Invalid comment service URL');
      }
      if (!/^\d+\.\d+\.\d+$/.test(version) || !commentPath?.startsWith('/')) {
        throw new Error('Invalid comment configuration');
      }
      const client = await loadClient();
      // Twikoo owns request errors, posting feedback and moderation messages after mounting.
      container.replaceChildren();
      await client.init({ envId, el: '#twikoo-comments', path: commentPath, lang: 'zh-CN' });
      status.hidden = true;
    } catch {
      status.textContent = '评论暂时无法加载，你可以稍后再试。文章仍可正常阅读。';
      retry.hidden = false;
    } finally {
      busy = false;
      section.setAttribute('aria-busy', 'false');
    }
  }
  retry.addEventListener('click', start);
  start();
})();
