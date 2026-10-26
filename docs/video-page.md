# 像写文章一样添加视频

视频记录和文章使用相同的 Markdown 写作方式。每个视频对应一份 .md，不需要运行导入命令，也不需要修改视频页面或列表。

## 每次新增只做三件事

1. **放视频**：将 MP4 放到项目的 media/ 文件夹，例如 media/我的视频.mp4。
2. **复制模板**：复制 content-templates/video.md 到 src/videos/，改名为 my-video.md。建议介绍文件用小写英文命名，MP4 可以使用中文文件名。
3. **修改并保存**：填写标题、日期、简介、视频路径和正文，最后将 draft 改为 false。

最小示例：

```markdown
---
title: 我的视频
date: 2026-10-26
author: sakari
category: 视频
description: 用一句话介绍这段影像。
videoUrl: /media/我的视频.mp4
draft: false
---

这里写视频介绍、拍摄背景或旅行中的故事。
```

videoUrl 的文件名必须和实际视频一致。date 可以是拍摄日期；不确定时填写收录日期。draft: true 表示草稿，draft: false 才会在页面显示。

当前《轨道》就是完整示例：

- 视频文件：media/轨道.mp4
- 介绍文件：src/videos/guidao.md
- 视频路径：videoUrl: /media/轨道.mp4
- 页面地址：/videos/guidao.html

可以直接复制这篇介绍再改成新视频，但记得同时修改标题、日期、视频路径和正文。时长不确定时可以删掉 duration。

## 可选信息

以下字段都不是必填项。需要时加到 Markdown 顶部的两个 --- 之间即可：

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

没有封面也能播放，页面会显示统一封面。封面尺寸、时长按实际素材填写，字幕文件使用 VTT。

## media/ 是否适合存视频

适合当前这种少量小视频。项目已配置 media/ 随网站发布，不需要再配置目录。

```text
src/posts/          文章 Markdown
src/travel/         游记 Markdown
src/videos/         视频介绍 Markdown
images/             图片和视频封面
media/              MP4、WebM 和字幕文件
```

视频多起来后，也可以自行创建 media/2026/ 等子文件夹，再将 videoUrl 写为 /media/2026/我的视频.mp4。

较大或较多的视频会使代码仓库和每次发布变重。后续将视频文件放到独立的视频存储时，只需把 videoUrl 改成可公开播放的视频直链，Markdown 写法不变。当前无需移动《轨道》。

media/ 是公开网站资源目录，里面的文件会随网站发布；draft 只控制介绍页是否显示。

## 预览和上线也和文章相同

本地开发预览已经运行时，保存 Markdown 后刷新 /video.html 即可。若没有运行，在项目目录执行一次 npm run dev，并打开终端打印的地址。如果新增内容未出现，重启本地开发预览。

上线前运行 npm run check，随后像文章一样把新增的 .md 和 MP4 一并提交、推送到 GitHub。仓库已有的 GitHub Actions 会生成和发布网站。本地保存并不会自动更新线上站点。

首次部署视频栏目时，页面、样式、播放器、配置和视频文件需要一并提交；之后新增视频通常只需提交对应的 Markdown、MP4 和可选封面。_site/ 和 node_modules/ 不需要提交。
