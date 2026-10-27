import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { channels, prepareContent, checkContentOutput, parseArticle } from './private-content.mjs';

const article = (draft = false, body = '正文') => '---\ntitle: 测试\ndate: 2026-01-01\ndescription: 摘要\ndraft: ' + draft + '\n---\n' + body;
async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), 'private-content-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'content');
  for (const channel of channels) {
    await mkdir(join(source, channel), { recursive: true });
    await mkdir(join(root, 'src', channel), { recursive: true });
    await writeFile(join(root, 'src', channel, channel + '.11tydata.js'), '// preserved');
  }
  return { root, source };
}

test('only explicitly published Markdown reaches the website input; templates are preserved', async t => {
  const { root, source } = await workspace(t);
  await writeFile(join(source, 'posts/Begining.md'), article(false, '可发布正文'));
  await writeFile(join(source, 'posts/secret-draft.md'), '---\ndraft: true\n---\nPRIVATE_SENTINEL');
  const result = await prepareContent({ root, source });
  assert.deepEqual(result, { published: 1, drafts: 1 });
  assert.deepEqual((await readdir(join(root, 'src/posts'))).sort(), ['Begining.md', 'posts.11tydata.js']);
  assert.match(await readFile(join(root, 'src/posts/Begining.md'), 'utf8'), /可发布正文/);
  assert.doesNotMatch(await readFile(join(root, 'src/posts/Begining.md'), 'utf8'), /PRIVATE_SENTINEL/);
});

test('unpublishing and deleting content removes previously imported records', async t => {
  const { root, source } = await workspace(t);
  const file = join(source, 'travel/trip.md');
  await writeFile(file, article());
  await prepareContent({ root, source });
  await writeFile(file, article(true));
  await prepareContent({ root, source });
  assert.deepEqual(await readdir(join(root, 'src/travel')), ['travel.11tydata.js']);
  await rm(file);
  assert.deepEqual(await prepareContent({ root, source }), { published: 0, drafts: 0 });
});

test('missing content, malformed YAML and ambiguous draft flags fail without replacing the last import', async t => {
  const { root, source } = await workspace(t);
  await writeFile(join(source, 'posts/valid.md'), article());
  await prepareContent({ root, source });
  await assert.rejects(prepareContent({ root, source: join(root, 'missing') }), /克隆私有内容仓库/);
  for (const body of ['---\ntitle: test\n---\nbody', article('"false"'), article('null'), '---\ndraft: [\n---\nPRIVATE_SECRET']) {
    await writeFile(join(source, 'posts/invalid.md'), body);
    await assert.rejects(prepareContent({ root, source }), error => !error.message.includes('PRIVATE_SECRET'));
    assert.match(await readFile(join(root, 'src/posts/valid.md'), 'utf8'), /正文/);
  }
});

test('content cannot override draft routing or Eleventy processing; duplicate filenames and nested files are rejected', async t => {
  const { root, source } = await workspace(t);
  for (const key of ['permalink', 'layout', 'tags', 'eleventyComputed', 'templateEngineOverride', 'pagination', 'contentType']) assert.throws(() => parseArticle(article(true).replace('draft: true', 'draft: true\n' + key + ': unsafe'), 'draft.md'), /覆盖/);
  await mkdir(join(source, 'posts/nested'));
  await assert.rejects(prepareContent({ root, source }), /子目录或链接/);
  await rm(join(source, 'posts/nested'), { recursive: true });
  await writeFile(join(source, 'posts/A.md'), article());
  await writeFile(join(source, 'posts/Ａ.md'), article());
  await assert.rejects(prepareContent({ root, source }), /冲突/);
});

test('output must exactly match published routes and never include Markdown, private checkout or Git metadata', async t => {
  const { root, source } = await workspace(t);
  await writeFile(join(source, 'posts/live.md'), article());
  await writeFile(join(source, 'posts/draft.md'), article(true, 'SECRET'));
  await prepareContent({ root, source });
  await mkdir(join(root, '_site/posts'), { recursive: true });
  await writeFile(join(root, '_site/posts/live.html'), '<h1>公开</h1>');
  assert.equal(await checkContentOutput(root), 1);
  await writeFile(join(root, '_site/posts/draft.html'), 'SECRET');
  await assert.rejects(checkContentOutput(root), /不一致/);
  await rm(join(root, '_site/posts/draft.html'));
  for (const file of ['source.md', 'config.yml', 'secret.pem', 'manifest.json']) {
    await writeFile(join(root, '_site', file), 'private');
    await assert.rejects(checkContentOutput(root), /拒绝部署/);
    await rm(join(root, '_site', file));
  }
  await mkdir(join(root, '_site/.git'));
  await assert.rejects(checkContentOutput(root), /拒绝部署/);
});
