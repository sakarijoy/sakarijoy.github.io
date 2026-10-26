# 评论区配置（Twikoo）

网站端已接入统一评论模板，实际接口为 https://sakarijoy-comments.netlify.app/.netlify/functions/twikoo ，后端仓库为 https://github.com/sakarijoy/twikoo-netlify 。文章、游记和视频详情页会自动使用该模板，列表页不加载评论脚本。未填写 envId 时只显示准备中提示。

配置进度（2026-10-25）：MongoDB Free 集群与 Netlify 服务已创建，数据库用户已限为 readWrite@twikoo，服务已获所有者确认公开。接口返回 code 100、版本 2.0.17。所有者已设置评论管理员密码；昵称必填、邮箱选填、人工审核、发言限速和来源限制已保存。已验证匿名留言、审核显示、回复关联、刷新保存和文章隔离；两条测试留言已隐藏，独立访客确认看不到测试内容。后续完善按所有者要求暂停，先提交当前博客代码。

## 1. 创建 MongoDB Atlas 数据库

- 注册并登录 https://www.mongodb.com/cloud/atlas/register 。注册、条款确认和密码设置由账号所有者完成。
- 选择 Free / M0，数据库集群可命名为 blog-comments；不加载示例数据。
- 创建专用于评论的数据库用户，保存在密码管理器里。账号登录密码与数据库用户密码是两回事。
- 建议给用户授予 twikoo 数据库的 readWrite 权限，无需 Atlas Admin；后面的连接地址务必包含 /twikoo 数据库名。
- Netlify 云函数的出口 IP 不固定。按 Twikoo 官方部署方案，Atlas 的 IP Access List 需要允许 0.0.0.0/0。这会开放数据库的网络入口，但连接仍需要数据库账号密码；设置这项前应由所有者确认。以后有固定出口时可缩小范围。
- 在集群 Connect → Drivers 获取连接地址。用户名和密码需要替换为数据库用户的实际值；特殊字符应 URL 编码。
- 连接地址结构是 mongodb+srv://用户名:密码@集群地址/twikoo?retryWrites=true&w=majority 。不要把这条含密码的地址写进仓库、文章、截图或聊天。

## 2. 部署评论服务到 Netlify

1. 注册并登录 https://app.netlify.com/signup ，选择 Free 套餐。当前新账号使用月度额度，具体以控制台为准，不使用旧教程的函数调用次数作为额度保证。
2. 将官方仓库 https://github.com/twikoojs/twikoo-netlify Fork 到自己的 GitHub。
3. Netlify 中选择 Add new project / Import an existing project → GitHub，只授权需要的评论服务仓库。
4. 导入 Fork 的仓库。按官方模板识别构建配置，不要把博客仓库当作评论后端导入。
5. 添加环境变量 MONGODB_URI，由所有者直接粘贴上一步的完整数据库连接地址。值属于服务端秘密，不填到博客文件中。
6. 部署完成并确认公开访问已启用，访问 https://你的项目.netlify.app/.netlify/functions/twikoo 。应显示 Twikoo 云函数运行正常；仅看到 Netlify 的部署成功提示还不能确认数据库已连通。
7. 记录这个公开接口地址以及后端 Twikoo 版本。前后端版本保持一致。

## 3. 配置博客

修改 src/_data/commentService.json：

~~~json
{
  "enabled": true,
  "envId": "https://你的项目.netlify.app/.netlify/functions/twikoo",
  "clientVersion": "2.0.17"
}
~~~

这里的 envId 是公开的 HTTPS 接口地址，不是数据库连接地址、管理员密码或访问令牌。clientVersion 需要与实际部署的后端版本对应。前端使用固定版本的 jsDelivr 客户端，网络或脚本加载失败时显示重试按钮；挂载之后的请求、发表错误和审核提示由 Twikoo 处理。

运行 npm run dev，在 http://localhost:4173/posts/Begining.html 检查。配置更新后会自动重新生成。运行 npm run check 进行发布前检查，再提交发布。

## 4. 首次管理设置

服务首次连通后立即打开评论区的管理入口，由所有者设置管理员密码。不要在未设置管理员密码的情况下公开接口地址。

建议配置：网站名称“我们的博客”、网站地址 https://sakarijoy.github.io/ 、昵称必填、邮箱选填、人工审核、每 IP 发言限速，暂不开启访客图片上传。先完成实际留言与审核测试，再设置邮件通知；通知需要邮件服务账号，普通文字评论本身不需要邮件服务。

Twikoo 的站点来源限制可设为 https://sakarijoy.github.io，并加入需要的本地预览来源。CORS 只约束浏览器跨域调用，不是评论接口的身份认证或完整防滥用机制。

Twikoo 的内置管理入口使用管理员密码，不能等同于两个人各自拥有独立管理账号。第二位作者可以像普通访客一样回复；若双方都需要独立管理员身份，需要另行选支持多管理员的评论系统或明确管理安排。

## 5. 日常写作

- 新文章自动拥有评论区，无需复制评论代码。
- 单篇关闭：在 Markdown 的 YAML 信息中添加 comments: false。
- 全站关闭：把 commentService.json 中 enabled 改为 false。
- 默认按生成网址区分评论，例如 /posts/Begining.html。本地与线上使用同一条路径，会访问同一组评论，查询参数和页内锚点不影响归属。
- 如需改文章文件名，先为文章添加 commentId: /posts/原来的文件名.html，沿用旧评论的路径标识，再改文件名。commentId 必须以 / 开头且每篇不同；仅改标题不影响评论。
- 评论保存在 MongoDB，不写进 Markdown；重建或发布博客不会清空评论。删除文章不会自动删除对应评论。
- 定期从管理面板导出评论，另存备份；免费云服务不等于已有备份保障。

## 上线验收

- 未登录访客可用昵称与正文提交评论，无需 GitHub 账号。
- 审核模式下待审核评论不会直接向所有访客公开，审核通过后刷新可见。原留言者的浏览器仍可看到自己的留言及“审核中”提示。
- 可以回复；两篇文章的评论不混在一起。
- 刷新后评论仍在；本地预览与线上同一文章显示同一组评论。
- 手机宽度无横向溢出；网络断开时正文仍能阅读。
- 配置与仓库里没有数据库连接密码或管理员密码。

## 官方文档

- https://twikoo.js.org/mongodb-atlas.html
- https://twikoo.js.org/backend.html#netlify-部署
- https://twikoo.js.org/frontend.html
- https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
- https://www.netlify.com/pricing/

## 留言输入项

当前博客前端仅显示昵称与留言正文，邮箱和网址输入组通过 styles/style.css 中限定在评论区内的样式隐藏，回复表单同样生效。此处没有删除历史留言或修改后台管理员的邮件配置。现有后台的 REQUIRED_FIELDS 保持 nick，邮箱和网址不必填。

若以后重新配置 Twikoo 后台，可将 DISPLAYED_FIELDS 与 REQUIRED_FIELDS 都设为 nick，组件会直接只渲染昵称；不要将已隐藏的邮箱或网址设为必填。当前样式适配固定的 Twikoo 2.0.17，按输入框 name（nick/mail/link）定位，不影响管理面板里的邮件通知设置。
