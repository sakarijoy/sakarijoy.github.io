# 图片源文件放在私有内容库

图片现在保存在私有仓库 `sakarijoy/blog-content` 的 `images/`，本地目录为 `D:\Developing\sakarijoy-blog-content\images`。网站代码仓库不再保存原始图片；网页地址仍使用 `/images/文件名`。

## 添加配图

1. 将图片放入私有内容库的 `images/`，可用中文名称或 `images/2026/` 这样的子目录。
2. 在同一私有库的文章、游记或视频介绍中填写图片路径。
3. 将图片与介绍一起提交到私有库，预览检查后发布。

封面示例，尺寸按实际文件填写：

```yaml
cover: /images/2026/旅行封面.webp
coverAlt: 准确描述图片内容
coverWidth: 1600
coverHeight: 900
```

正文图片也使用 `/images/...`，可沿用 Markdown 或 HTML 写法。现有发布检查要求生成的 img 具有 alt、width、height；直接使用 HTML 可以明确填写这些字段：

```html
<img src="/images/2026/旅行照片.webp" alt="照片说明" width="1600" height="900" loading="lazy">
```

支持 PNG、JPEG、WebP、SVG、GIF、AVIF、ICO。不要把私有 GitHub 网页地址当图片直链。共享的 SVG 建议自包含，不依赖其他未明确引用的文件。

## 网站固定图片

- 头像由网站代码 `src/_data/site.json` 中的 owners.avatar 指定，图片自动从私有库读取。
- 页头图、favicon 等固定资源由网站代码 `site-assets.json` 明确列出。新增模板或 CSS 使用的固定图片时，也将 `/images/...` 路径加到此清单。
- 文章的封面、正文图片、HTML src/srcset/poster 与行内背景图由构建自动识别。

## 发布边界

只有固定资源、头像以及已发布记录真正引用的图片进入 `_site/images/`。草稿专用或未引用的图片不复制；Markdown 代码示例和 HTML 注释里的示例路径也不作为配图发布。共享图片只要仍被网站或另一篇已发表记录使用，就会公开。

缺少已引用的图片时构建失败，保留上次成功部署。下架后新的构建会移除不再使用的图片，但此前公开仓库的历史和访客已有副本不会自动消失。此功能不是图片访问鉴权；已发布图片仍可公开查看。

公开 PR 使用独立生成的中性测试图片，不读取或提交真实照片。NAS 保持暂停。
