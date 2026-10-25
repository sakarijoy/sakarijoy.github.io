import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { validateCommentService } from './tools/comment-config.mjs';
export default function (eleventyConfig) {
  eleventyConfig.on('eleventy.before', async () => {
    const config = JSON.parse(await readFile(new URL('./src/_data/commentService.json', import.meta.url), 'utf8'));
    validateCommentService(config);
  });
  eleventyConfig.addPassthroughCopy({ images: 'images', styles: 'styles', scripts: 'scripts', '.nojekyll': '.nojekyll' });
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
  const published = (items) => items.filter(entry => entry.data.draft !== true).sort((a, b) => b.date - a.date || a.url.localeCompare(b.url));
  eleventyConfig.addCollection('published', collection => published(collection.getFilteredByTag('entry')));
  for (const kind of ['posts', 'travel', 'videos']) {
    eleventyConfig.addCollection(kind, collection => published(collection.getFilteredByTag(kind)));
  }
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });
  return { dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' }, templateFormats: ['njk', 'md'], markdownTemplateEngine: false, htmlTemplateEngine: 'njk' };
}
