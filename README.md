# 我们的博客

网站使用 Eleventy + GitHub Pages，代码与文章分别管理：

- 网站代码（公开）：https://github.com/sakarijoy/sakarijoy.github.io
- 文章内容（私有）：https://github.com/sakarijoy/blog-content
- 正式博客：https://sakarijoy.github.io/

构建时通过只读部署密钥读取内容，只把已发布记录生成网页。访客无需连接文章仓库。当前在线写作入口是私有仓库的 GitHub 文件编辑器；独立双人后台尚未启用，第二位账号确认后再邀请。NAS 接入保持暂停。

## 本地开始

需要 Node.js 20 或更高版本及私有内容仓库的访问权限。默认目录：

```text
Developing/
  sakarijoy.github.io/       网站代码
  sakarijoy-blog-content/    私有文章
    posts/                  文章
    travel/                 游记
    videos/                 视频介绍
    media/                  视频与 VTT 字幕
    content-templates/      写作模板
```

首次使用：

```sh
git clone https://github.com/sakarijoy/blog-content.git ../sakarijoy-blog-content
npm ci
npm run dev
```

默认打开 http://127.0.0.1:4173/。工具同时监听网站与私有内容，保存后完整重建，刷新浏览器查看；删除、下架文章也会清理旧页面。从远端修改后先在内容库执行 `git pull --ff-only`。

其他内容目录可在 `content-source.json` 的 `localDirectory` 配置，或设置环境变量 `CONTENT_DIR`。该文件的 `repository`、`branch` 控制线上读取来源，不能填写密码或令牌。

## 写作

在**私有文章仓库**中：

1. 复制 `content-templates/article.md` 到 `posts/`；游记模板放 `travel/`；视频介绍模板放 `videos/`。
2. 修改标题、日期、作者、摘要与正文。文件名可使用英文、数字、中文、连字符与下划线，栏目不支持子文件夹。
3. 明确填写 `draft: true` 保存草稿，公开时改为 `draft: false`，布尔值不加引号。
4. 在网站目录运行 `npm run check` 并预览，然后把 Markdown 提交、推送到**私有文章仓库**。

```markdown
---
title: 一个值得记住的日子
date: 2026-10-27
author: 填写作者
category: 随笔
description: 一两句话介绍文章内容。
draft: false
---

这里开始写正文。
```

首页、列表、搜索、归档、RSS、地图与阅读导航会自动更新。原有文件名保持不变，旧网址与评论继续沿用；要改文件名时先设置 `commentId: /posts/原文件名.html`。

网站 `src/posts/*.md`、`src/travel/*.md`、`src/videos/*.md` 是被 Git 忽略的临时副本，**不要在这里写作**，构建会覆盖它们。草稿不会被复制进这些目录。

## 发布

网站仓库 Pages Source 使用 **GitHub Actions**。工作流在网站代码推送到 main、手动执行，以及约每半小时的定时任务中读取最新内容。

**文章库提交不会直接触发网站仓库的 push 事件。** 要立即上线，到网站仓库 **Actions → Build and deploy static blog → Run workflow**。也可等待定时更新；GitHub 调度可能延迟，长期无活动时可能暂停，需要手动重新启用。

Secret `CONTENT_DEPLOY_KEY` 仅能读取文章库。读取失败或密钥缺失时停止部署，保留线上上次成功版本。公开 PR 检查仅使用虚构测试内容，不接触文章或密钥。详见 [私有内容配置](docs/private-content.md)。

## 常用命令

```sh
npm run dev           # 监听两个目录并本地预览
npm run check         # 构建、资源、RSS/sitemap、隐私检查和测试
npm run build         # 读取私有内容并生成 _site
npm run preview       # 只预览现有 _site，不监听修改
npm run content:sync  # 仅同步已发布 MD，不生成网页
```

## 媒体与站点资料

- 图片、头像、封面仍放网站 `images/`。封面同时填写 `coverAlt`、`coverWidth`、`coverHeight`。
- 视频文件放在私有内容库 `media/`，介绍放 `videos/`。`videoUrl` 仍写 `/media/轨道.mp4` 这样的博客地址；构建自动复制已发布记录引用的视频和字幕。NAS 接入未启用。
- 网站代码库的 `images/` 仍是公开资源目录。私有库 `media/` 的草稿专用和未引用视频不会发布；已发布记录引用的视频会公开播放。
- 网站资料在 `src/_data/site.json`；评论配置在 `src/_data/commentService.json`；公共模板在 `src/_includes/`。

私有源文件不等于已发布正文私有。公开仓库的历史版本仍可能含有旧文章，此次没有重写历史。

## 说明

- [私有内容与发布](docs/private-content.md)
- [网站架构](docs/architecture.md)
- [旅行地图](docs/travel-map.md)
- [视频写作](docs/video-page.md)
- [评论配置](docs/comments-setup.md)
- [双人后台后续安排](docs/shared-blog-plan.md)
