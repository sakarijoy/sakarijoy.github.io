import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { absoluteUrl } from './content.mjs';
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(workspace, '_site');
const site = JSON.parse(await readFile(resolve(workspace, 'src/_data/site.json'), 'utf8'));
const problems = [], canonicalPages = new Set();
async function htmlFiles(folder) {
  const files = [];
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const path = resolve(folder, item.name);
    if (item.isDirectory()) files.push(...await htmlFiles(path));
    else if (item.name.endsWith('.html')) files.push(path);
  }
  return files;
}
for (const file of await htmlFiles(root)) {
  const html = await readFile(file, 'utf8');
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) continue;
  const expected = absoluteUrl('/' + relative(root, file).split(sep).join('/'), site.url);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical !== expected) problems.push(relative(root, file) + ': incorrect canonical URL');
  if (canonicalPages.has(canonical)) problems.push('Duplicate canonical URL');
  canonicalPages.add(canonical);
  for (const name of ['title', 'type', 'url', 'image', 'description']) if (!new RegExp('<meta property="og:' + name + '" content="[^\"]+"').test(html)) problems.push(relative(root, file) + ': missing Open Graph ' + name);
}
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
if (!sitemap.startsWith('<?xml') || !sitemap.includes('http://www.sitemaps.org/schemas/sitemap/0.9')) problems.push('Invalid sitemap header');
if (new Set(locations).size !== locations.length) problems.push('Duplicate sitemap URL');
if (locations.length !== canonicalPages.size || locations.some(url => !canonicalPages.has(url))) problems.push('Sitemap must include exactly the indexable HTML pages');
const feed = await readFile(resolve(root, 'feed.xml'), 'utf8');
if (!feed.startsWith('<?xml') || !feed.includes('<rss version="2.0"')) problems.push('Invalid RSS header');
const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => match[1]);
const guids = new Set();
for (const item of items) {
  const guid = item.match(/<guid isPermaLink="true">([^<]+)<\/guid>/)?.[1];
  const link = item.match(/<link>([^<]+)<\/link>/)?.[1];
  if (!guid || guid !== link || guids.has(guid)) problems.push('Missing or duplicate RSS identity');
  guids.add(guid);
  const date = item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1];
  if (!date || !Number.isFinite(Date.parse(date))) problems.push('Invalid RSS date');
  try {
    const url = new URL(link);
    if (url.origin !== new URL(site.url).origin) throw new Error();
    const target = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    if (!target.startsWith(root + sep) || !(await stat(target)).isFile()) throw new Error();
  } catch { problems.push('RSS item must resolve to a generated page'); }
}
const robots = await readFile(resolve(root, 'robots.txt'), 'utf8');
if (!robots.includes('Sitemap: ' + absoluteUrl('/sitemap.xml', site.url))) problems.push('robots.txt must point to the canonical sitemap');
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else console.log('OK: ' + canonicalPages.size + ' canonical pages, sitemap/robots, ' + items.length + ' RSS items and share metadata.');
