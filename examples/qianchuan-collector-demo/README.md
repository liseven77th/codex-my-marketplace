# 千川采集工具演示视频示例（Windows）

本目录提供可复现工程包。完整原始源码、模拟服务、分镜、中文语速/字幕适配、Edge TTS、截图与渲染脚本已打包在 `project-source.tar.xz` 中。

## 一键执行

在 Windows 11 安装 Node.js 18+、Python 3.9+ 和 FFmpeg（包含 ffmpeg/ffprobe 并加入 PATH），然后从仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\examples\qianchuan-collector-demo\extract-and-run.ps1 -InstallDeps
```

默认生成晓晓普通话女声（`zh-CN-XiaoxiaoNeural`）和最终 MP4。如果 Edge TTS 网络不可用，可添加 `-SkipVoice` 只生成静音字幕审核版。

解压后的工程位于本目录的 `workspace\`，自动执行入口为 `workspace\run-demo.ps1`。生成的音频、截图和视频只保存在本地，不会提交到 Git。

## 安全边界

- 使用原始 `source/web/index.html`，但 API 全部由本地模拟服务提供。
- 不连接真实千川账户、不读取 Cookie、不调用真实采集接口。
- 素材删除接口固定返回 HTTP 403。
- 模拟服务仅监听 `127.0.0.1:18765`，不占用真实工具默认的 `8765` 端口。

## 参数

`extract-and-run.ps1` 支持：

- `-InstallDeps`：安装 Python 依赖并下载 Playwright Chromium。
- `-SkipVoice`：跳过在线女声生成，只生成静音字幕审核版。
- `-SkipCapture`：复用已存在的截图（解压后的 workspace 中必须已有 capture/frames）。

更多细节见解压包内 README。
