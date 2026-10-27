const text = value => typeof value === 'string' && value.trim().length > 0;
export function validateSite(site) {
  let url;
  try { url = new URL(site.url); } catch { throw new Error('site.url 必须是正式网站的 HTTPS 地址。'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('site.url 应为不带路径、参数或账号密码的 HTTPS 主域名。');
  if (!text(site.title) || !text(site.description)) throw new Error('站点标题和简介不能为空。');
}
function checkResource(value, label, problems) {
  if (value === undefined || value === null || value === '') return;
  if (!text(value)) { problems.push(label + ' 应填写文件路径或 HTTPS 地址'); return; }
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !value.includes('..')) return;
  try { const url = new URL(value); if (url.protocol === 'https:' && !url.username && !url.password) return; } catch { /* Report a useful content error below. */ }
  problems.push(label + ' 应填写以 / 开头的站内路径或不带账号密码的 HTTPS 地址');
}
export function contentProblems(entry) {
  const data = entry.data;
  const problems = [];
  if (data.draft !== undefined && typeof data.draft !== 'boolean') problems.push('draft 必须是 true 或 false，不要加引号');
  if (data.draft === true) return problems;
  if (!text(data.title)) problems.push('标题 title 不能为空');
  if (!text(data.description)) problems.push('摘要 description 不能为空');
  if (!data.date || !Number.isFinite(new Date(data.date).getTime())) problems.push('请填写有效的 date 日期');
  if (typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) && Number.isFinite(Date.parse(data.date)) && new Date(data.date).toISOString().slice(0, 10) !== data.date) problems.push('date 中的日期不存在');
  if (data.visitDateUnknown !== undefined && typeof data.visitDateUnknown !== 'boolean') problems.push('visitDateUnknown 必须是布尔值');
  for (const key of ['cover', 'videoUrl', 'captionsUrl']) checkResource(data[key], key, problems);
  if (data.cover && (!text(data.coverAlt) || !Number.isInteger(data.coverWidth) || data.coverWidth <= 0 || !Number.isInteger(data.coverHeight) || data.coverHeight <= 0)) problems.push('封面需要 coverAlt 以及正整数 coverWidth、coverHeight');
  const location = data.location;
  if (location) {
    const supplied = value => value !== undefined && value !== null && value !== '';
    if (supplied(location.latitude) || supplied(location.longitude)) {
      if (!Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180) problems.push('location 经纬度需成对填写数字，纬度 -90～90，经度 -180～180');
    }
    if (supplied(location.countryCode) && !/^[A-Z]{2}$/.test(location.countryCode)) problems.push('countryCode 请用两个大写字母，例如 CN 或 JP');
  }
  if (data.commentId !== undefined && (typeof data.commentId !== 'string' || !data.commentId.startsWith('/') || data.commentId.startsWith('//') || /[?#]/.test(data.commentId))) problems.push('commentId 必须是以 / 开头且不含参数和锚点的站内路径');
  return problems;
}
export function selectPublished(entries) {
  const issues = [], urls = new Set();
  for (const entry of entries) {
    const label = entry.inputPath || entry.data.page?.inputPath || entry.data.title || '未命名内容';
    for (const problem of contentProblems(entry)) issues.push(label + '：' + problem);
    if (entry.data.draft !== true && entry.url) {
      if (urls.has(entry.url)) issues.push(label + '：发布网址重复');
      urls.add(entry.url);
    }
  }
  if (issues.length) throw new Error('内容检查未通过：\n' + issues.join('\n'));
  return entries.filter(entry => entry.data.draft !== true).sort((a, b) => b.date - a.date || a.url.localeCompare(b.url));
}
export function absoluteUrl(target, siteUrl) {
  return new URL(target === '/index.html' ? '/' : target, siteUrl.replace(/\/$/, '') + '/').href;
}
export function indexablePages(entries) {
  return entries.filter(entry => entry.url && (entry.url.endsWith('.html') || entry.url.endsWith('/')) && entry.data.draft !== true && entry.data.noindex !== true);
}
export function groupByYear(entries) {
  const years = new Map();
  for (const entry of entries) {
    const year = new Date(entry.date).getUTCFullYear();
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(entry);
  }
  return [...years].sort(([a], [b]) => b - a).map(([year, items]) => ({ year, entries: [...items].sort((a, b) => b.date - a.date) }));
}
export function entryNeighbors(entries, url) {
  const current = entries.find(entry => entry.url === url);
  if (!current) return {};
  const siblings = entries.filter(entry => entry.data.contentType === current.data.contentType);
  const index = siblings.findIndex(entry => entry.url === url);
  return { previous: siblings[index + 1], next: siblings[index - 1] };
}
