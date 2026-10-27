import { lstat, readFile, realpath } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import MarkdownIt from 'markdown-it';
import { Parser } from 'htmlparser2';

const markdown = new MarkdownIt({ html: true });
const extensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif', '.ico']);

export function imageName(value, base = '/index.html') {
  if (typeof value !== 'string' || !value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return null;
  let url;
  try { url = new URL(value, 'https://content.invalid' + base); }
  catch { throw new Error('图片地址无效。'); }
  if (!url.pathname.startsWith('/images/')) return null;
  let name;
  try { name = decodeURIComponent(url.pathname.slice('/images/'.length)); }
  catch { throw new Error('图片地址编码无效。'); }
  if (name.split('/').some(part => !part || part === '.' || part === '..' || /[\\\u0000-\u001f:?#]/.test(part)) || !extensions.has(extname(name).toLowerCase())) throw new Error('images 地址必须是站内图片路径，不可包含路径跳转。');
  return name;
}

export function markdownImages(body, base) {
  const names = new Set();
  const add = value => { const name = imageName(value, base); if (name) names.add(name); };
  const content = body.replace(/^\uFEFF/, '').replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
  const parser = new Parser({
    onopentag(_tag, attributes) {
      for (const key of ['src', 'href', 'poster']) if (attributes[key]) add(attributes[key]);
      if (attributes.srcset) for (const candidate of attributes.srcset.split(',')) add(candidate.trim().split(/\s+/)[0]);
      if (attributes.style) for (const match of attributes.style.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g)) add(match[1] || match[2] || match[3]);
    }
  }, { decodeEntities: true });
  // Parsing rendered HTML excludes Markdown examples, code blocks and HTML comments.
  parser.end(markdown.render(content));
  return [...names];
}

export async function publishedImages(source, articles, root) {
  const [assets, site] = await Promise.all([
    readFile(resolve(root, 'site-assets.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, 'src/_data/site.json'), 'utf8').then(JSON.parse)
  ]);
  if (!Array.isArray(assets.images) || assets.images.some(value => typeof value !== 'string' || !value.startsWith('/images/'))) throw new Error('site-assets.json 的 images 必须列出站内固定图片路径。');
  const names = new Set();
  for (const value of [...assets.images, ...(site.owners || []).map(owner => owner.avatar)]) {
    const name = imageName(value);
    if (name) names.add(name);
  }
  for (const article of articles.filter(article => !article.draft)) {
    const base = '/' + article.channel + '/' + article.name.replace(/\.md$/, '.html');
    const cover = imageName(article.data.cover, base);
    if (cover) names.add(cover);
    for (const name of markdownImages(article.body, base)) names.add(name);
  }
  const files = [], identities = new Set();
  for (const name of names) {
    const identity = name.normalize('NFKC').toLowerCase();
    if (identities.has(identity)) throw new Error('images 中存在大小写或字符规范化后重名的发布文件。');
    identities.add(identity);
    let file = resolve(source);
    for (const part of ['images', ...name.split('/')]) {
      file = resolve(file, part);
      const info = await lstat(file).catch(() => null);
      if (!info || info.isSymbolicLink() || await realpath(file) !== file) throw new Error('已引用的图片在私有内容库 images 中不存在，或使用了符号链接。');
    }
    const info = await lstat(file);
    if (!info.isFile() || !info.size) throw new Error('已引用的图片必须是非空普通文件。');
    files.push({ name, file, size: info.size });
  }
  return files;
}
