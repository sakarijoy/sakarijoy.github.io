import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentDirectory } from './private-content.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const valueFlags = new Set(['file', 'slug', 'title', 'date', 'author', 'category', 'place', 'description', 'duration']);
export function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index].replace(/^--/, '');
    if (args[index] === '--publish') { options.publish = true; continue; }
    if (!args[index].startsWith('--') || !valueFlags.has(key)) throw new Error('未知参数：' + args[index]);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error('--' + key + ' 缺少值');
    options[key] = value;
  }
  return options;
}
export async function addVideo(options, root = projectRoot, contentRoot) {
  for (const key of ['file', 'slug', 'title', 'date']) if (!options[key]?.trim()) throw new Error('请填写 --' + key);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.slug)) throw new Error('slug 请使用小写英文、数字和连字符，例如 guidao。');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date) || !Number.isFinite(Date.parse(options.date)) || new Date(options.date).toISOString().slice(0, 10) !== options.date) throw new Error('日期必须有效，格式为 YYYY-MM-DD。');
  if (options.duration && !/^(?:\d+:)?\d{1,2}:[0-5]\d$/.test(options.duration)) throw new Error('时长请写为 MM:SS 或 HH:MM:SS。');
  const source = resolve(root, options.file);
  const extension = extname(source).toLowerCase();
  if (!['.mp4', '.webm', '.ogv'].includes(extension)) throw new Error('请选择 MP4、WebM 或 OGV 视频文件。');
  const info = await stat(source).catch(() => null);
  if (!info?.isFile() || !info.size) throw new Error('视频文件不存在或为空：' + options.file);
  const content = contentRoot || await contentDirectory(root);
  const entries = resolve(content, 'videos');
  const media = resolve(content, 'media');
  const entryPath = resolve(entries, options.slug + '.md');
  if (await stat(entryPath).catch(() => null)) throw new Error('同名视频介绍已存在，请更换 --slug 或直接编辑原文件。');
  const mediaRelative = relative(media, source);
  const alreadyInMedia = mediaRelative && !isAbsolute(mediaRelative) && !mediaRelative.startsWith('..' + sep) && mediaRelative !== '..';
  const destination = alreadyInMedia ? source : resolve(media, options.slug + extension);
  const relativeURL = '/media/' + (alreadyInMedia ? mediaRelative.split(sep).join('/') : basename(destination));
  const quote = value => JSON.stringify(value);
  const lines = [
    '---', 'title: ' + quote(options.title), 'date: ' + options.date,
    'author: ' + quote(options.author || 'sakari'), 'category: 视频',
    'videoCategory: ' + quote(options.category || '影像记录'),
    ...(options.place ? ['place: ' + quote(options.place)] : []),
    'description: ' + quote(options.description || '《' + options.title + '》影像记录，拍摄信息与内容介绍待补充。'),
    'videoUrl: ' + quote(relativeURL),
    ...(options.duration ? ['duration: ' + quote(options.duration)] : []),
    'draft: ' + (options.publish ? 'false' : 'true'), '---', '',
    '## 这段影像', '', '这里收录《' + options.title + '》视频。', '',
    '## 镜头里的故事', '', '拍摄地点、背景与画面背后的故事待补充。', '',
    '<!-- date 是记录日期；已知拍摄日期时可以填写拍摄日期，否则填写收录日期。当前记录日期：' + options.date + '。 -->', ''
  ];
  await mkdir(entries, { recursive: true }); await mkdir(media, { recursive: true });
  if (!alreadyInMedia) await copyFile(source, destination, constants.COPYFILE_EXCL);
  await writeFile(entryPath, lines.join('\n'), { encoding: 'utf8', flag: 'wx' });
  return { entryPath, videoUrl: relativeURL, size: info.size, published: Boolean(options.publish) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--help')) {
    console.log('npm run video:add -- --file "../sakarijoy-blog-content/media/视频.mp4" --slug my-film --title "视频标题" --date 2026-10-27 [--category "影像记录"] [--place "地点"] [--duration "00:06"] [--publish]');
    console.log('默认生成草稿；--publish 让记录进入本地列表。命令不会执行 Git 提交或上传。');
  } else {
    try {
      const result = await addVideo(parseArguments(process.argv.slice(2)));
      console.log('已生成：' + result.entryPath + '\n视频地址：' + result.videoUrl + '\n大小：' + (result.size / 1024 / 1024).toFixed(2) + ' MB\n状态：' + (result.published ? '已加入本地视频列表' : '草稿，完善后将 draft 改为 false') + '\n下一步：npm run check，然后在本地预览。');
    } catch (error) { console.error('添加失败：' + error.message); process.exitCode = 1; }
  }
}
