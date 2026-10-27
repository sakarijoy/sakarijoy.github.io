# 旅行地图与文件分析

当前项目使用 Eleventy 3 生成静态博客，src 是页面模板与临时构建输入，styles 和 scripts 是样式与交互，图片源文件保存在私有内容库 images/，博客地址保持 /images/...。src/travel.njk 是旅行首页，私有内容库 travel/ 下的 Markdown 是游记，content-templates/travel.md 是写作模板。地图根据已发布游记中的经纬度显示点位，不根据配图或普通文章猜测地点。私有内容配置见 [说明](private-content.md)。

## 添加真实地点

1. 复制 content-templates/travel.md 到私有内容库 travel/，使用不同文件名。
2. 填写标题、日期、作者、摘要和正文。
3. 在 location.name 填写地点，latitude 填纬度，longitude 填经度。使用 WGS84 十进制度数字；不要直接混入 GCJ-02 或 BD-09 坐标。纬度范围 -90 至 90，经度范围 -180 至 180，0 是有效值。
4. 将 draft 改为 false 后运行 npm run dev，打开 /travel.html。发布前运行 npm run check。

每篇游记支持一个主要地点。多个地点可以分别写为游记。未填写坐标可以正常阅读；填写了非法或不完整坐标时构建会提示修正。搜索按地点、标题、摘要匹配，并可按年份筛选；列表定位按钮与地图标记互相联动。正式点位来自内容，不做在线地址猜测。相同坐标的记录仍在列表分别显示，可由列表按钮查看各篇弹窗。

地图采用 Leaflet 1.9.4 和 OpenStreetMap 标准底图，需要访问 unpkg.com 与 tile.openstreetmap.org；网络异常时保留游记列表并显示错误提示。较大访问量或正式商用前应按 https://operations.osmfoundation.org/policies/tiles/ 选择合适的瓦片服务。当前修改保留现有 GitHub Pages 发布方式，本地构建不会自动更新线上网站。

## 按时间连接足迹

地图默认启用“按旅行日期连线”。同一年内的可见点位按游记 date 从早到晚连接；跨年份不会连接。筛选年份或搜索时，连线同步更新；取消勾选可隐藏连线。连线是地点之间的示意线，不表示开车、铁路或飞行的真实轨迹。同一天的记录保持现有列表顺序，建议填写真实旅行日期。

例如，分别创建青岛和长春两篇游记，在 location 中填写下列城市级近似坐标，并将 date 改成各自的真实到访日期，draft 改成 false。不要把示例日期当成实际行程。

青岛：

```yaml
location:
  name: 山东 · 青岛
  latitude: 36.07
  longitude: 120.38
```

长春：

```yaml
location:
  name: 吉林 · 长春
  latitude: 43.88
  longitude: 125.32
```

两篇 date 均在 2026 年时，选择 2026 年即可看到两点及连线。城市级坐标适合展示足迹，具体景点请换成对应地点的 WGS84 坐标。

## 日期暂不明确的点位

冲绳南城市和美丽海水族馆分别保存在 私有内容库 travel/okinawa-nanjo.md 与 私有内容库 travel/okinawa-churaumi.md。如将 visitDateUnknown 设置为 true，页面会显示“旅行日期待补充”，年份筛选中归入“日期待补充”，并暂不参与日期连线。date 暂存建档日期。确定真实旅行日期后修改 date，并将 visitDateUnknown 改为 false，即可参与对应年份的连线。

南城市使用城市级近似坐标 26.1631, 127.7706（https://en.wikipedia.org/wiki/Nanj%C5%8D）；水族馆使用 26.6944, 127.8780（https://jmapcode.com/mapcode/okinawa-churaumi-aquarium），位置与官方交通信息 https://oki-churaumi.jp/en/guide/access/ 对照。

## 地图圆点

location.countryCode 为 CN 时显示暖橙色圆点，为 JP 时显示蓝色圆点，其他代码使用绿色。不显示图标分类图例；悬停、键盘聚焦或点击点位仍能查看地点，游记定位与时间连线保留。常熟使用城市级近似坐标 31.65, 120.73，来源：https://ungegn.un.org/dashboard/cities/details?id=1945 。
