# 视频文件与介绍一起放在私有内容库

每个视频对应一份 Markdown。只需复制模板、改内容，不必运行导入命令或修改页面代码。

## 新增步骤

在 `sakarijoy-blog-content` 仓库操作：

1. 把视频放入 `media/`，例如 `media/我的视频.mp4`。字幕也可放在这里。
2. 复制 `content-templates/video.md` 到 `videos/`，改名为 `my-video.md`。
3. 修改标题、日期、简介、正文，以及 `videoUrl: /media/我的视频.mp4`。
4. 未写完用 `draft: true`，准备公开时改为 `draft: false`。
5. 把视频与介绍一起提交、推送到这个私有仓库。
6. 到网站仓库 Actions 手动运行发布，或等待约每半小时的定时构建；GitHub 调度可能延迟。

也可以在私有仓库的 GitHub 网页通过 Add file → Upload files 上传视频，再编辑 videos 中的 MD。普通 GitHub 网页上传有文件大小限制，较大的文件请用本地 Git；超过普通仓库限制的视频需要另行规划独立存储，不要把它们重新放回网站代码库。

## 示例

```markdown
---
title: 我的视频
date: 2026-10-27
author: sakari
category: 视频
description: 用一句话介绍这段影像。
videoUrl: /media/我的视频.mp4
draft: false
---

这里写视频介绍、拍摄背景或旅行中的故事。
```

路径中的文件名必须与私有库 media 下的文件一致，中文也支持。可以用 `media/2026/视频.mp4` 这样的子目录，对应 `videoUrl: /media/2026/视频.mp4`。网站中不要填写私有仓库的 GitHub 页面链接或需要登录的 raw 链接。

《轨道》的源文件是私有库 `media/轨道.mp4`，介绍是 `videos/guidao.md`，博客地址仍为 `/media/轨道.mp4` 与 `/videos/guidao.html`。

## 可选字段

```yaml
videoCategory: 旅行影像
place: 福冈
duration: "03:24"
cover: /images/my-video-cover.webp
coverAlt: 准确描述封面画面
coverWidth: 1280
coverHeight: 720
captionsUrl: /media/my-video.zh.vtt
```

封面仍放在网站仓库 images/，尺寸与时长按实际素材填写。没有封面时保留统一占位。

## 哪些文件会公开

- 构建只从私有库复制已发布记录引用的视频和 VTT 字幕，生成到 `_site/media/`，不再将源视频提交到公开网站代码仓库。
- 草稿专用和未引用的文件不发布；同一视频被其他已发布记录引用时，它仍会公开。
- 图片仍是公开网站资源，draft 不会隐藏 images/ 中的封面。
- 已发布视频会公开播放和下载。转为草稿后新部署不再包含独占的视频文件，但不能撤回旧 Git 历史或访问者已有的副本。
- 没有启用视频登录访问、加密播放或 NAS；NAS 设置继续暂停。

## 本地预览

在网站代码目录运行 `npm run dev`，同时监听私有库 Markdown 与 media 的修改。保存后完整重建，刷新 `/video.html` 查看；发布前运行 `npm run check`。

视频较多或较大时，私有 Git 仓库仍会增长，网站发布包也会变大。这次迁移解决的是代码与内容分开管理，不是独立的视频点播服务。

配置详情见 [私有内容说明](private-content.md)。

官方文件与站点限制：

- https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
