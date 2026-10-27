import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { contentDirectory, projectRoot } from './private-content.mjs';

const source = await contentDirectory();
let running = false, pending = false, timer, preview, child, stopping = false;
const watchers = [];
async function build() {
  if (running) { pending = true; return; }
  running = true;
  do {
    pending = false;
    const code = await new Promise(done => {
      child = spawn(process.execPath, ['tools/build.mjs'], { cwd: projectRoot, stdio: 'inherit' });
      child.once('exit', code => done(code ?? 1));
      child.once('error', () => done(1));
    });
    child = null;
    if (code === 0 && !preview && !stopping) preview = spawn(process.execPath, ['tools/preview.mjs'], { cwd: projectRoot, stdio: 'inherit', env: { ...process.env, PORT: process.env.PORT || '4173' } });
    if (code !== 0) console.error('本次构建失败，修改后保存会重试。');
  } while (pending && !stopping);
  running = false;
}
function changed(_event, filename = '') {
  const name = String(filename).replaceAll('\\', '/');
  // Imported Markdown is written by the build itself; watch its private source instead.
  if (/^(?:posts|travel|videos)(?:$|\/[^/]+\.md$)/.test(name)) return;
  clearTimeout(timer);
  timer = setTimeout(() => { void build(); }, 250);
}
for (const folder of ['src', 'styles', 'scripts', 'images', 'tools']) watchers.push(watch(resolve(projectRoot, folder), { recursive: true }, changed));
watchers.push(watch(source, { recursive: true }, (event, name = '') => {
  const filename = String(name).replaceAll('\\', '/');
  if (!/^(?:posts|travel|videos|media)(?:\/|$)/.test(filename)) return;
  clearTimeout(timer); timer = setTimeout(() => { void build(); }, 250);
}));
for (const file of ['eleventy.config.js', 'content-source.json']) watchers.push(watch(resolve(projectRoot, file), changed));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  stopping = true; clearTimeout(timer);
  watchers.forEach(watcher => watcher.close());
  child?.kill(); preview?.kill();
});
console.log('监听网站与私有内容源；保存后完整重建，浏览器刷新后查看。');
await build();
