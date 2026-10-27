import { prepareContent } from './private-content.mjs';
try {
  const result = await prepareContent();
  console.log('内容已同步：' + result.published + ' 条已发布记录；草稿未进入网站输入目录。');
} catch (error) { console.error(error.message); process.exitCode = 1; }
