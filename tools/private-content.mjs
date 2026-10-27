import { lstat, mkdir, readFile, readdir, realpath, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { contentProblems } from './content.mjs';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const channels = ['posts', 'travel', 'videos'];
const reserved = ['layout', 'permalink', 'tags', 'eleventyComputed', 'eleventyExcludeFromCollections', 'templateEngineOverride', 'renderData', 'pagination', 'page', 'collections', 'contentType', 'noindex', '__proto__', 'constructor', 'prototype'];

export async function contentDirectory(root = projectRoot, env = process.env) {
  const config = JSON.parse(await readFile(resolve(root, 'content-source.json'), 'utf8'));
  if (!/^[\w-]+\/[\w.-]+$/.test(config.repository) || !config.branch) throw new Error('content-source.json 中的 repository / branch 无效。');
  return resolve(root, env.CONTENT_DIR || config.localDirectory);
}

async function plainDirectory(path) {
  const info = await lstat(path).catch(() => null);
  if (!info?.isDirectory() || info.isSymbolicLink() || await realpath(path) !== path) throw new Error('内容目录不存在或包含符号链接，请先克隆私有内容仓库或设置 CONTENT_DIR。');
}

export function parseArticle(source, label) {
  const match = source.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(label + '：缺少 YAML 文件头。');
  let data;
  try { data = yaml.load(match[1], { schema: yaml.JSON_SCHEMA }); }
  catch { throw new Error(label + '：YAML 文件头无效（不输出正文，请在本地检查）。'); }
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.draft !== 'boolean') throw new Error(label + '：必须明确填写 draft: true 或 draft: false。');
  if (reserved.some(key => Object.hasOwn(data, key))) throw new Error(label + '：内容不能覆盖网站的模板、网址或集合设置。');
  const problems = contentProblems({ data });
  if (problems.length) throw new Error(label + '：' + problems.join('；'));
  return data;
}

export async function readContent(source) {
  source = resolve(source);
  await plainDirectory(source);
  const articles = [], identities = new Set();
  for (const channel of channels) {
    const folder = resolve(source, channel);
    await plainDirectory(folder);
    for (const item of await readdir(folder, { withFileTypes: true })) {
      if (item.name === '.gitkeep' && item.isFile()) continue;
      const label = channel + '/' + item.name;
      if (!item.isFile() || !/^[\p{L}\p{N}][\p{L}\p{N}_-]*\.md$/u.test(item.name)) throw new Error(label + '：栏目中只允许直接存放 Markdown 文件，不能包含子目录或链接。');
      const identity = label.normalize('NFKC').toLowerCase();
      if (identities.has(identity)) throw new Error(label + '：文件名与另一篇记录冲突。');
      identities.add(identity);
      const file = resolve(folder, item.name);
      if ((await lstat(file)).size > 4 * 1024 * 1024) throw new Error(label + '：Markdown 超过 4 MB，请将大文件放在独立媒体存储。');
      const body = await readFile(file, 'utf8');
      const data = parseArticle(body, label);
      articles.push({ channel, name: item.name, body, draft: data.draft });
    }
  }
  return articles;
}

export async function prepareContent({ root = projectRoot, source, env = process.env } = {}) {
  source = resolve(source || await contentDirectory(root, env));
  if (source === root || source.startsWith(resolve(root, 'src') + sep) || source.startsWith(resolve(root, '_site') + sep)) throw new Error('内容源必须与网站输入和输出目录分离。');
  // Validate the complete source before replacing any previously imported files.
  const articles = await readContent(source);
  for (const channel of channels) {
    const folder = resolve(root, 'src', channel);
    await plainDirectory(folder);
    for (const item of await readdir(folder, { withFileTypes: true })) {
      if (!item.name.endsWith('.md')) continue;
      if (!item.isFile()) throw new Error('拒绝覆盖非普通文件：' + channel + '/' + item.name);
      await unlink(resolve(folder, item.name));
    }
  }
  const published = articles.filter(article => !article.draft);
  for (const article of published) await writeFile(resolve(root, 'src', article.channel, article.name), article.body, 'utf8');
  const manifest = {
    published: published.map(article => article.channel + '/' + article.name.replace(/\.md$/, '.html')),
    drafts: articles.filter(article => article.draft).map(article => article.channel + '/' + article.name.replace(/\.md$/, '.html'))
  };
  await mkdir(resolve(root, '.content-build'), { recursive: true });
  await writeFile(resolve(root, '.content-build/manifest.json'), JSON.stringify(manifest), 'utf8');
  return { published: published.length, drafts: articles.length - published.length };
}

export async function checkContentOutput(root = projectRoot) {
  const manifest = JSON.parse(await readFile(resolve(root, '.content-build/manifest.json'), 'utf8'));
  const expected = new Set(manifest.published);
  const generated = new Set();
  for (const channel of channels) {
    const folder = resolve(root, '_site', channel);
    const items = await readdir(folder, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
    for (const item of items) {
      if (!item.isFile() || !item.name.endsWith('.html')) throw new Error('内容输出中出现了不允许的文件或目录。');
      generated.add(channel + '/' + item.name);
    }
  }
  if (expected.size !== generated.size || [...generated].some(name => !expected.has(name))) throw new Error('内容输出与已发布清单不一致，拒绝部署。');
  // Nothing from the private checkout, including its Git metadata, may be uploaded.
  async function inspect(folder) {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      if (item.isSymbolicLink() || ['.git', '.content-build', '.private-content', 'content-source.json', 'manifest.json'].includes(item.name) || /\.(?:md|ya?ml|pem|key|env)$/i.test(item.name)) throw new Error('发布目录含有源文件、凭据或私有元数据，拒绝部署。');
      if (item.isDirectory()) await inspect(resolve(folder, item.name));
    }
  }
  await inspect(resolve(root, '_site'));
  return generated.size;
}
