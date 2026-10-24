export default {
  layout: 'entry.njk', tags: ['entry', 'videos'], contentType: 'video', heading: '影像记录', navKey: 'videos', listingUrl: '/video.html', listingLabel: '视频',
  eleventyComputed: { permalink: data => data.draft === true ? false : '/videos/' + data.page.fileSlug + '.html' }
};
