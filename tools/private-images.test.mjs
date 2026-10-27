import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { imageName, markdownImages } from './private-images.mjs';
import { channels, prepareContent, checkContentOutput } from './private-content.mjs';

async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), 'private-images-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'content');
  for (const channel of channels) {
    await mkdir(join(source, channel), { recursive: true });
    await mkdir(join(root, 'src', channel), { recursive: true });
  }
  await mkdir(join(root, 'src/_data'));
  await writeFile(join(root, 'src/_data/site.json'), JSON.stringify({ owners: [{ avatar: '/images/avatar.svg' }] }));
  await writeFile(join(root, 'site-assets.json'), JSON.stringify({ images: ['/images/header.svg'] }));
  await mkdir(join(source, 'images'));
  for (const name of ['header', 'avatar', 'cover', 'body', 'draft', 'unused']) await writeFile(join(source, 'images', name + '.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><title>' + name + '</title></svg>');
  return { root, source };
}
const article = (draft = false, body = '![正文](/images/body.svg)') => '---\ntitle: 测试\ndate: 2026-01-01\ndescription: 摘要\ncover: /images/' + (draft ? 'draft' : 'cover') + '.svg\ncoverAlt: 配图\ncoverWidth: 1\ncoverHeight: 1\ndraft: ' + draft + '\n---\n' + body;

test('image paths resolve relative to article URLs and reject unsafe encodings', () => {
  assert.equal(imageName('../images/旅行%20照.png?v=1#view', '/posts/post.html'), '旅行 照.png');
  assert.equal(imageName('https://example.com/image.png'), null);
  assert.equal(imageName('//example.com/image.png'), null);
  assert.equal(imageName('/images/%2e%2e/secret.png'), null);
  for (const value of ['/images/%5csecret.png', '/images/secret.pem', '/images/%00photo.png']) assert.throws(() => imageName(value));
});

test('Markdown, reference images and HTML are detected without publishing code examples or comments', () => {
  const body = [
    '![inline](/images/相册/a.webp)', '![reference][photo]', '', '[photo]: ../images/b.png', '',
    '<img src="/images/c.jpg?v=1&amp;theme=light">',
    '<source srcset="/images/d.avif 1x, /images/e.webp 2x">',
    '<div style="background-image:url(\'/images/f.png\')"></div>', '',
    '<!-- ![hidden](/images/comment.png) <img src="/images/comment2.png"> -->', '',
    '`![code](/images/code.png)`', '', '```md', '![example](/images/example.png)', '```'
  ].join('\n');
  assert.deepEqual(markdownImages(body, '/posts/a.html'), ['相册/a.webp', 'b.png', 'c.jpg', 'd.avif', 'e.webp', 'f.png']);
});

test('site images and published covers/body are staged, but draft-only and unused originals stay private', async t => {
  const { root, source } = await workspace(t);
  await writeFile(join(source, 'posts/live.md'), article());
  await writeFile(join(source, 'posts/draft.md'), article(true));
  await prepareContent({ root, source });
  assert.deepEqual((await readdir(join(root, '.content-build/public-images'))).sort(), ['avatar.svg', 'body.svg', 'cover.svg', 'header.svg']);
  await writeFile(join(source, 'posts/live.md'), article(true));
  await prepareContent({ root, source });
  assert.deepEqual((await readdir(join(root, '.content-build/public-images'))).sort(), ['avatar.svg', 'header.svg']);
  assert.match(await readFile(join(source, 'images/draft.svg'), 'utf8'), /draft/);
});

test('missing published image stops before replacing the last successful import', async t => {
  const { root, source } = await workspace(t);
  await writeFile(join(source, 'posts/live.md'), article());
  await prepareContent({ root, source });
  await writeFile(join(source, 'posts/live.md'), article(false, '![缺失](/images/missing.svg)'));
  await assert.rejects(prepareContent({ root, source }), /图片.*不存在/);
  assert.match(await readFile(join(root, 'src/posts/live.md'), 'utf8'), /body.svg/);
  await rm(join(source, 'posts/live.md'));
  await rm(join(source, 'images/header.svg'));
  await assert.rejects(prepareContent({ root, source }), /图片.*不存在/);
});

test('deployment rejects extra images and detects corrupted copies', async t => {
  const { root, source } = await workspace(t);
  await writeFile(join(source, 'posts/live.md'), article());
  await prepareContent({ root, source });
  await mkdir(join(root, '_site/posts'), { recursive: true });
  await writeFile(join(root, '_site/posts/live.html'), '<h1>live</h1>');
  await cp(join(root, '.content-build/public-images'), join(root, '_site/images'), { recursive: true });
  assert.equal(await checkContentOutput(root), 1);
  await writeFile(join(root, '_site/images/draft.svg'), 'private');
  await assert.rejects(checkContentOutput(root), /图片输出/);
  await rm(join(root, '_site/images/draft.svg'));
  await writeFile(join(root, '_site/images/cover.svg'), 'corrupted');
  await assert.rejects(checkContentOutput(root), /图片输出/);
});
