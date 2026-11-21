# 鹈鹕六千年的车 · Pure-Code Edition

## 本 fork：骑行动作重写 v2

观看新版：**https://u9-hbzhang.github.io/pelican-6000-pure-code/**

本版重写了鹈鹕骑行动作，加入明显的前倾发力、抬头舒展及尾羽跟随；保留原作场景、音乐、字幕和时间线。轻点画面开始播放，没有常驻按钮。GitHub Pages 从 `main` 分支根目录发布。

手机横屏：跟随手机实际方向适配，移除了手动旋转。开始播放后，手机转横时申请浏览器原生全屏；若浏览器要求用户手势，轻点画面即可重试，并保持播放。转回竖屏时退出自动进入的全屏。需要关闭系统竖屏方向锁定。原画为 4:3，按比例最大显示，宽屏两侧保留黑边，不裁掉画面或拉伸人物。

兼容限制：部分 iPhone / 微信不提供 Canvas 网页原生全屏能力，网页无法隐藏其导航栏；这种情况下只能最大化浏览器内容区域，不等于系统全屏。音频使用媒体播放类别；网页无法可靠检测 iPhone 静音开关，首次播放只显示 2.5 秒条件提示（若无声，请关闭静音并调高音量），不会声称检测到了静音。

以下保留原作介绍与致谢。

零音频采样（0 MP3/WAV）、零外部位图（0 PNG/JPG）、零外置字体包（0 WOFF2/TTF）——由 **Hydrogen** 独立交付的一整部 **2 分 55 秒（174.64s）** 纯代码中文交互式视听长卷：涵盖铁匠铺矢量篆刻开场、穿越 20 个艺术史时代、Live Canvas/SVG 动态笔触渲染与浏览器 `AudioWorklet` 实时中文歌声/多轨器乐合成。

- **在线直开（GitHub Pages）**：https://wwh5441.github.io/pelican-6000-pure-code/
- **单文件离线包下载**：前往 [Releases 最新版](https://github.com/wwh5441/pelican-6000-pure-code/releases/latest) 下载 `pelican-6000-pure-code-single.zip`

## 本版资产体积

- `鹈鹕骑行_纯代码全片_单文件版.zip`：`1.93 MB`
- `鹈鹕骑行_纯代码全片_单文件版.html`：`2.56 MiB`（单文件内嵌 Gzip-9 虚拟文件系统，浏览器可直接打开）

## 播放交互控制

播放器没有常驻按钮，轻点画面开始播放；首次操作提示和声音提示均在 2.5 秒后消失。保留原作快捷操作：

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
