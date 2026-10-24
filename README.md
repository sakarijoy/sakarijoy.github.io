# 我们的博客

当前阶段是静态网站制作：文章内容使用 Markdown，页面由 Eleventy 生成。双人在线登录、上传、评论和 NAS 接入暂缓，后续需求保存在 docs/shared-blog-plan.md。

## 快速开始

需要 Node.js 20 或更高版本。在仓库目录运行：

```sh
npm ci
npm run dev
```

打开终端给出的本地地址（默认 http://localhost:4173）。保存源文件后预览会自动更新。结束时按 Ctrl+C。

正式生成与检查：

```sh
npm run check
```

输出目录为 `_site/`。它包含普通 HTML、CSS、图片和少量浏览器脚本，可部署到静态网站托管服务。修改源文件后要重新生成，不直接编辑 `_site/`。

只查看已经生成的页面：

```sh
npm run preview
```

该预览只监听本机并提供生成后的网页资源，不提供源文件和目录列表。


## 保存后网页没有更新时

1. 在项目目录运行 `npm run dev`，并让该进程一直运行。退出进程或关闭终端后，就不会继续自动生成和刷新。
2. 打开开发服务器地址 `http://localhost:4173/`，不要直接打开 `_site` 中的文件，也不要把线上 GitHub Pages 页面当成本地实时预览。
3. 新文章放在 `src/posts/`，扩展名为 `.md`，需要显示时设置 `draft: false`。
4. `npm run preview` 只显示现有生成结果，不监听文章修改。写作时使用 `npm run dev`。
5. 如果浏览器之前断开过，预览服务启动后手动刷新一次，重新连接自动刷新客户端。

## 目录与修改位置

| 路径 | 用途 |
| --- | --- |
| `src/posts/*.md` | 独立文章内容 |
| `src/travel/*.md` | 独立旅行记录 |
| `src/videos/*.md` | 视频介绍和已有视频文件地址 |
| `src/_data/site.json` | 博客名称、简介、导航和两位记录者资料 |
| `src/_includes/` | 公共页头、页脚、侧栏和文章模板 |
| `src/*.njk` | 首页、列表、关于与 404 页面 |
| `styles/style.css` | 公共样式 |
| `scripts/search.js` | 静态文章搜索 |
| `images/` | 图片与静态媒体 |
| `content-templates/` | 新增内容时可复制的 Markdown 模板，不会发布 |
| `_site/` | 生成后的可发布网页，已加入 Git 忽略 |
| `tools/` | 输出清理、预览和站内检查工具 |
| `.github/workflows/pages.yml` | 构建并发布到 GitHub Pages 的工作流 |

## 写一篇文章

1. 复制 `content-templates/article.md` 到 `src/posts/`，使用小写英文和连字符命名，例如 `my-first-note.md`。
2. 修改文件开头的标题、日期、作者、分类和摘要，在第二条 `---` 之后写正文。
3. 准备好后把 `draft: true` 改成 `draft: false`。
4. 运行本地预览，确认显示，再执行 `npm run check`。

首页、文章列表、文章总数、最近更新与归档数量都会自动整理，不用手动添加链接。

```markdown
---
title: 一个值得记住的日子
date: 2026-10-24
author: 填写作者
category: 随笔
description: 一两句话介绍这篇文章。
draft: false
---

这里开始写正文。

## 一个小标题

这里继续写。
```

没有封面时可以省略封面字段。添加封面时填写：

```yaml
cover: /images/your-cover.webp
coverAlt: 准确描述图片内容
coverWidth: 1440
coverHeight: 414
```

宽高应按实际图片修改。正文中引用 images 目录的图片可写成 `![说明](../images/your-image.webp)`。

静态草稿不会生成网页或进入列表，但草稿源文件仍属于仓库；公开仓库里的草稿不是私密存储。每次正式构建只清理专用的 `_site/` 输出，避免已删除或转为草稿的旧网页残留。

## 旅行与视频

- 将 `content-templates/travel.md` 复制到 `src/travel/`，即可添加游记。
- 将 `content-templates/video.md` 复制到 `src/videos/`，填写标题、作者、介绍和 `videoUrl`。
- `videoUrl` 需要是实际可访问、浏览器可播放的视频文件地址，例如 MP4；播放器对第三方页面链接不作解析。
- 当前没有编造的游记或视频。没有内容时栏目会显示明确的空状态。
- 这一阶段没有网页上传功能，媒体文件需手动准备。大量视频的存储与发布方式待 NAS 阶段决定。

## 两位记录者

修改 `src/_data/site.json` 中的 `owners`。第二位记录者目前保留明确的“名字与介绍待补充”，没有创建虚构账号。

两位记录者各自的 `avatar` 字段控制“一起记录”卡片中的头像，`avatarAlt` 是图片说明。将图片放在 `images/`，填写如 `/images/your-avatar.webp` 的路径即可更换。第二个头像目前使用通用人像占位。

同一个文件还可以修改博客名称、页头说明和导航。当前名称“我们的博客”可随时替换。

## 搜索与无障碍

文章列表支持按标题、摘要、分类和作者搜索；多个关键词需同时匹配，提供清空和无结果提示。没有 JavaScript 时文章仍正常展示。网页包含键盘焦点、跳到正文链接，并对减少动态效果的系统偏好作出响应。

## 图片资源

页面使用压缩后的 `header.webp`、`xiaoxiang.webp`、`avatar.webp` 和 `favicon.png`。原始素材继续保留，便于重新导出；暂未引用的图片不会被页面主动加载。山景只是沿用的站点配图，不代表已发表的真实旅行经历。

## GitHub Pages 发布

远程仓库：https://github.com/sakarijoy/sakarijoy.github.io

站点地址：https://sakarijoy.github.io/

本项目通过 GitHub Actions 生成并上传 `_site/`。仓库 **Settings → Pages → Source** 应设置为 **GitHub Actions**。

工作流在 main 分支推送或手动触发时运行：安装固定依赖 → 生成并检查 → 上传生成目录 → 部署。不要直接把整个源码目录当成新站点发布。

发布状态以仓库 Actions 中的实际构建、部署结果和线上页面为准。本地预览不会自动更新线上站点。

官方说明：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
