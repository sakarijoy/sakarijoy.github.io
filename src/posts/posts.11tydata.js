export default {
  layout: 'entry.njk', tags: ['entry', 'posts'], contentType: 'article', heading: '文字记录', navKey: 'posts', listingUrl: '/page.html', listingLabel: '文章',
  eleventyComputed: { permalink: data => data.draft === true ? false : '/posts/' + data.page.fileSlug + '.html' }
};
