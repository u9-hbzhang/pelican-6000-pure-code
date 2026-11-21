# 鹈鹕六千年的车 · Pure-Code Edition

## 本 fork：骑行动作重写 v2

观看新版：**https://u9-hbzhang.github.io/pelican-6000-pure-code/**

本版重写了鹈鹕骑行动作，加入明显的前倾发力、抬头舒展及尾羽跟随；保留原作场景、音乐、字幕和时间线。点击“开始播放”或画面开始播放。GitHub Pages 从 `main` 分支根目录发布。

手机与微信：点“横屏观看”后将手机横着拿，网页会自行旋转，无需依赖系统全屏或方向锁定 API。点“帮助”可恢复声音、复制观看链接。音频使用媒体播放类别；若旧版 iOS / 微信仍然无声，请关闭 iPhone 静音模式并调高媒体音量。没有“浏览器打开”菜单时，可以复制链接到 Safari。

以下保留原作介绍与致谢。

零音频采样（0 MP3/WAV）、零外部位图（0 PNG/JPG）、零外置字体包（0 WOFF2/TTF）——由 **Hydrogen** 独立交付的一整部 **2 分 55 秒（174.64s）** 纯代码中文交互式视听长卷：涵盖铁匠铺矢量篆刻开场、穿越 20 个艺术史时代、Live Canvas/SVG 动态笔触渲染与浏览器 `AudioWorklet` 实时中文歌声/多轨器乐合成。

- **在线直开（GitHub Pages）**：https://wwh5441.github.io/pelican-6000-pure-code/
- **单文件离线包下载**：前往 [Releases 最新版](https://github.com/wwh5441/pelican-6000-pure-code/releases/latest) 下载 `pelican-6000-pure-code-single.zip`

## 本版资产体积

- `鹈鹕骑行_纯代码全片_单文件版.zip`：`1.93 MB`
- `鹈鹕骑行_纯代码全片_单文件版.html`：`2.56 MiB`（单文件内嵌 Gzip-9 虚拟文件系统，浏览器可直接打开）

## 播放交互控制

播放器提供播放、声音、横屏、重播和帮助按钮，也保留原作快捷操作：

- **点击画面 / `Space`**：播放 / 暂停（首次交互解锁实时 `AudioWorklet` 合成器）
- **双击画面 / `F`**：进入 / 退出全屏
- **`M`**：静音切换
- **`R`**：从头重播
- **`←` / `→`**：快退 / 快进 `5` 秒

## 本地运行与重新构建

双击 [启动纯代码全片.command](./启动纯代码全片.command) 后在浏览器打开 `http://127.0.0.1:8922/`；如需重新打包单文件离线版，可运行：

```bash
python3 ./tools/build_single_html.py
```

## 致敬与鸣谢

- 原创测试命题源头：Simon Willison — *"A pelican riding a bicycle"*
- 20 幕艺术史命题先行开源项目：[orbitoo/pelican-test](https://github.com/orbitoo/pelican-test)（及同源项目 [RoyceBella-commits/The-Pelican-Test](https://github.com/RoyceBella-commits/The-Pelican-Test)）
- 开源社区认可与友链：[LINUX DO](https://linux.do/)（真诚、友善、团结、专业，本项目已在 LINUX DO 开源交流发布）
