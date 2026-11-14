import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { validateCommentService } from './tools/comment-config.mjs';
import { validateSite, selectPublished, absoluteUrl, indexablePages, groupByYear, entryNeighbors } from './tools/content.mjs';
export default function (eleventyConfig) {
  // Published Markdown is imported locally and intentionally excluded from Git.
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.on('eleventy.before', async () => {
    const config = JSON.parse(await readFile(new URL('./src/_data/commentService.json', import.meta.url), 'utf8'));
    validateCommentService(config);
    validateSite(JSON.parse(await readFile(new URL('./src/_data/site.json', import.meta.url), 'utf8')));
  });
  eleventyConfig.addPassthroughCopy({ '.content-build/public-images': 'images', styles: 'styles', scripts: 'scripts', '.content-build/public-media': 'media', '.nojekyll': '.nojekyll' });
  eleventyConfig.addPassthroughCopy({ 'static/jizhang': 'jizhang' });
  eleventyConfig.on('eleventy.after', async ({ dir }) => {
    const ledger = path.join(dir.output, 'jizhang');
    const index = path.join(ledger, 'index.html');
    const workerFile = path.join(ledger, 'sw.js');
    const [html, worker] = await Promise.all([readFile(index, 'utf8'), readFile(workerFile, 'utf8')]);
    const version = createHash('sha256').update(html).update(worker).digest('hex').slice(0, 16);
    const appHead = [
      `  <meta name="ledger-version" content="${version}">`,
      '  <link rel="manifest" href="manifest.webmanifest">',
      '  <link rel="icon" type="image/png" href="icon-192.png">',
      '  <link rel="apple-touch-icon" sizes="180x180" href="icon-180.png">',
      '</head>',
    ].join('\n');
    await writeFile(index, html.replace('</head>', appHead));
    await writeFile(path.join(ledger, 'version.json'), JSON.stringify({ version }));
    await writeFile(workerFile, worker.replace('__LEDGER_VERSION__', version));
    await writeFile(path.join(ledger, 'offline.html'), html);
  });
  eleventyConfig.addNunjucksFilter('relativeUrl', (target, from = '/index.html') => {
    if (/^(?:https?:|mailto:|#)/.test(target)) return target;
    const source = typeof from === 'string' ? from : '/index.html';
    return path.posix.relative(path.posix.dirname(source), target) || 'index.html';
  });
  eleventyConfig.addNunjucksFilter('isoDate', value => new Date(value).toISOString().slice(0, 10));
  eleventyConfig.addNunjucksFilter('displayDate', value => {
    const date = new Date(value);
    return date.getUTCFullYear() + ' 年 ' + (date.getUTCMonth() + 1) + ' 月 ' + date.getUTCDate() + ' 日';
  });
  eleventyConfig.addNunjucksFilter('take', (items, count) => items.slice(0, count));
  eleventyConfig.addNunjucksFilter('year', () => new Date().getFullYear());
  eleventyConfig.addNunjucksFilter('yearOfDate', value => new Date(value).getUTCFullYear());
  eleventyConfig.addNunjucksFilter('absoluteUrl', absoluteUrl);
  eleventyConfig.addNunjucksFilter('rssDate', value => new Date(value).toUTCString());
  eleventyConfig.addNunjucksFilter('groupByYear', groupByYear);
  eleventyConfig.addNunjucksFilter('entryNeighbors', entryNeighbors);
  eleventyConfig.addCollection('indexable', collection => indexablePages(collection.getAll()));
  const published = selectPublished;
  eleventyConfig.addCollection('published', collection => published(collection.getFilteredByTag('entry')));
  for (const kind of ['posts', 'travel', 'videos']) {
    eleventyConfig.addCollection(kind, collection => published(collection.getFilteredByTag(kind)));
  }
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });
  return { dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' }, templateFormats: ['njk', 'md'], markdownTemplateEngine: false, htmlTemplateEngine: 'njk' };
}
