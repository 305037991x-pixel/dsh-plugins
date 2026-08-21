# dsh-virtual-desktop — 虚拟桌面（本机 MVP）

> 复刻豆包“虚拟桌面”本机版：网页里看本机屏幕、点鼠标、敲键盘。MVP 为本机直控（会移动当前鼠标），隔离不抢屏为下一阶段。

## 功能（MVP）

- `POST /api/virtual-desktop/capture` — 本机全屏截图（JPEG base64，支持多显示器 VirtualScreen）
- `POST /api/virtual-desktop/input` — 点击/输入/按键/滚轮（PowerShell SendInput + SendKeys，归一化坐标 0..1）
- `GET /api/virtual-desktop/status` — 平台信息
- 浏览器侧：侧边栏 `🖥️ 虚拟桌面` 按钮 → 浮层面板（截图预览、刷新、点图即点、文本键入、快捷键）

## 依赖

- Node.js ≥22.19, DSH ≥0.1.0-rc.6
- Windows 本机（截图依赖 System.Drawing / System.Windows.Forms）

## 安装

```powershell
dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/dsh-virtual-desktop
# 重启 dsh web 并 Ctrl+Shift+R 硬刷新
```

## 下一阶段

- 隔离虚拟桌面（虚拟显示器 IddSampleDriver + 独立 RDP 会话，后台不抢屏）
- DXGI 高帧截图 + UIA 文本定位 + 录屏回放 + 文件共享沙盒
