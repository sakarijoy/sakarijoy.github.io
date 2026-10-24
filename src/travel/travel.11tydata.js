export default {
  layout: 'entry.njk', tags: ['entry', 'travel'], contentType: 'travel', heading: '旅行记录', navKey: 'travel', listingUrl: '/travel.html', listingLabel: '旅行',
  eleventyComputed: { permalink: data => data.draft === true ? false : '/travel/' + data.page.fileSlug + '.html' }
};
