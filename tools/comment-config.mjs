export function validateCommentService(config) {
  if (typeof config.enabled !== 'boolean' || typeof config.envId !== 'string' || !/^\d+\.\d+\.\d+$/.test(config.clientVersion)) {
    throw new Error('评论配置格式错误：enabled 应为布尔值，envId 应为公开接口地址，clientVersion 应为固定的 x.y.z 版本。');
  }
  if (!config.envId.trim()) return;
  let url;
  try { url = new URL(config.envId); } catch { throw new Error('评论 envId 必须是公开的 HTTPS 接口地址，不是数据库连接字符串。'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('评论 envId 仅可填写公开的 HTTPS 接口地址，不能包含密码、查询参数或锚点。');
  }
}
