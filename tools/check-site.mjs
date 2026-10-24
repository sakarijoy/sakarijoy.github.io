import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '_site');
const problems = [];
let count = 0, references = 0;
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (['.html', '.css'].includes(extname(full))) files.push(full);
  }
  return files;
}
for (const file of await walk(root)) {
  const source = await readFile(file, 'utf8');
  const name = relative(root, file);
  count++;
  if (!source.trim()) problems.push(name + ': empty file');
  if (extname(file) === '.html') {
    if (!/<html\s+lang="zh-CN"/.test(source)) problems.push(name + ': missing document language');
    if (!/<title>[^<]+<\/title>/.test(source)) problems.push(name + ': missing page title');
    if (!/<meta name="description" content="[^"]+"/.test(source)) problems.push(name + ': missing description');
    if ((source.match(/<h1[ >]/g) || []).length !== 1) problems.push(name + ': expected one h1');
    const images = source.match(/<img\b[^>]*>/g) || [];
    for (const img of images) if (!/\balt="[^"]*"/.test(img) || !/\bwidth="\d+"/.test(img) || !/\bheight="\d+"/.test(img)) problems.push(name + ': image needs alt, width and height');
    const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    if (new Set(ids).size !== ids.length) problems.push(name + ': duplicate element IDs');
  }
  for (const match of source.matchAll(/(?:href|src)=["']([^"']+)|url\(["']?([^"')]+)/g)) {
    const ref = match[1] || match[2];
    if (/^(?:[a-z]+:|\/\/)/i.test(ref)) continue;
    references++;
    const [rawPath, anchor] = ref.split('#');
    const decoded = decodeURIComponent(rawPath.split('?')[0]);
    const pathname = decoded.endsWith('/') ? decoded + 'index.html' : decoded;
    const target = pathname ? resolve(pathname.startsWith('/') ? root : dirname(file), '.' + (pathname.startsWith('/') ? pathname : '/' + pathname)) : file;
    if (target !== root && !target.startsWith(root + sep)) { problems.push(name + ': reference outside site: ' + ref); continue; }
    try {
      const info = await stat(target);
      if (!info.isFile() || !info.size) { problems.push(name + ': missing or empty target: ' + ref); continue; }
      if (anchor && extname(target) === '.html') {
        const html = await readFile(target, 'utf8');
        const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
        if (!ids.includes(decodeURIComponent(anchor))) problems.push(name + ': missing anchor: ' + ref);
      }
    } catch { problems.push(name + ': missing target: ' + ref); }
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else console.log('OK: ' + count + ' HTML/CSS files, ' + references + ' local references; no empty pages, missing assets or broken anchors.');
