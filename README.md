# xhs-mcp

复用本机 Chromium 的 RedNote 海外版或小红书国内版登录会话的只读 MCP，通过 CDP 连接浏览器并以 stdio 提供服务。支持搜索、读取笔记和图片、查看首页及当前账号的收藏；不提供发布、点赞或评论功能。默认连接本机 `9223`；读取操作创建自己的临时标签页并关闭，`xhs_open_home` 则保留新标签页供用户浏览。不关闭已有标签页或 Chromium，不导出 Cookie。项目非平台官方产品，网页变化和账号风控可能影响使用，请遵守平台条款及适用法律。

## 运行

要求 Node.js 22+ 及支持 CDP 的 Chromium 系浏览器。先启动一个启用远程调试的浏览器，在该浏览器登录 https://www.rednote.com/（海外版）或 https://www.xiaohongshu.com/（国内版）。可用 `XHS_MCP_CDP_URL` 指定本机 CDP 地址（默认尝试 IPv4 和 IPv6 的 9223）。

获取本仓库并在仓库根目录执行：

```sh
npm ci
npm run doctor
npm start
```

`npm start` 启动 stdio MCP 服务，通常由 MCP 客户端启动和管理；它不是交互式终端或 HTTP 服务。`npm run doctor` 输出连接与已有站点标签页的状态。依赖中的 Playwright Core 不会为你安装浏览器。

### 安全的浏览器设置

CDP 可以完全控制浏览器、读取登录会话；只绑定回环地址，不要暴露到局域网或互联网，也不要通过不可信的代理转发。**只连接自己信任的本机 CDP 端点及 MCP 客户端**；本机其他进程也可能访问该端口。建议使用专用的浏览器数据目录，避免调试日常浏览器或使用日常个人资料。示例中将浏览器可执行文件替换为本机路径（macOS 可用 `/Applications/Chromium.app/Contents/MacOS/Chromium`）：

```sh
"/path/to/chromium" --remote-debugging-address=127.0.0.1 --remote-debugging-port=9223 --user-data-dir="$HOME/.xhs-mcp-browser"
```

这个目录包含登录数据，请勿提交或分享；保留它可维持登录状态。若已有可信的专用 CDP 浏览器及 profile，可继续使用，不需要重建、删除或重置。不同浏览器版本的调试参数或 profile 限制可能不同；确认端口没有被其他程序占用。`doctor` 只检查已有站点标签页，返回 `unknown` 不一定表示未登录。读取结果、收藏、账号标识和签名链接也可能敏感；请勿提交或公开真实数据。

MCP 客户端配置：

```json
{
  "mcpServers": {
    "xiaohongshu": {
      "command": "node",
      "args": ["/absolute/path/to/xhs-mcp/src/cli.js", "serve"],
      "env": {"XHS_MCP_SITE":"rednote"}
    }
  }
}
```

Codex 配置对应：

```toml
[mcp_servers.xiaohongshu]
command = "node"
args = ["/absolute/path/to/xhs-mcp/src/cli.js", "serve"]
tool_timeout_sec = 600

[mcp_servers.xiaohongshu.env]
XHS_MCP_SITE = "rednote"
```

将示例中的 `/absolute/path/to/xhs-mcp` 替换为实际仓库绝对路径；若客户端找不到 `node`，将 `command` 换成本机 Node 可执行文件的绝对路径。`mcp.config.json` 是同样需要替换路径的示例，并非服务自动加载的配置；复制到客户端后按其格式配置。

## 站点与账号选择

`XHS_MCP_SITE` 支持 `rednote`、`xiaohongshu`、`auto`。未设置时为 `auto`：优先选择已登录的海外版，其次选择已登录的国内版。示例配置使用 `rednote`；显式选择的海外站点未登录时不会借用国内账号。

`xhs_session_status`、`xhs_search`、`xhs_search_and_read`、`xhs_list_saved` 支持可选 `site` 参数，可临时覆盖默认设置。状态工具会返回 `site`、`origin` 和两个站点各自的登录状态，便于核对账号。读取笔记和图片则遵循实际 URL 所属站点，支持海外版 `/user/profile/<用户 ID>/<笔记 ID>` 链接；不会擅自替换域名。

## 工具

| 工具 | 用途 |
|---|---|
| `xhs_session_status` | 检查浏览器和两个站点的登录状态，明确当前选择的站点 |
| `xhs_open_home` | `site`：在现有 Chromium 打开首页、前置并保留新标签页，可供用户登录或浏览 |
| `xhs_home_feed` | `site`、`limit`（1–50，默认 10）：有限滚动首页瀑布流，返回卡片及原始链接 |
| `xhs_list_saved` | `site`、`limit`（1–3000，默认 50），读取当前账号收藏页的可见笔记、封面和原帖链接 |
| `xhs_read_note` | `url` 接受完整链接、短链接或整段分享文案，读取全文、作者、图片、视频及可用中文字幕 |
| `xhs_read_note_image` | `url`、从 1 开始的 `index`（1–100），返回实际图片，供视觉模型阅读图中文字 |
| `xhs_search` | `query`、`limit`（1–50，默认 10），搜索并返回序号和 `search_id` |
| `xhs_read_search_results` | `search_id` 搭配 `first_n` 或 `ranks`，逐个读取所选笔记，两者不可同时传入 |
| `xhs_search_and_read` | `query`、`limit`（默认 5），搜索后读取前 N 条 |

例如：在 MCP 客户端先调用 `xhs_search`，参数为 `{"query":"旅行攻略","limit":10,"site":"rednote"}`；再用返回的 ID 调用 `xhs_read_search_results`，参数为 `{"search_id":"返回的 UUID","ranks":[1,3,5]}`。也可用 `first_n:3` 读取前三条，必须且只能选择 `first_n` 或 `ranks` 之一。序号来自一次固定搜索快照，按网页返回顺序排列；并非按热度重新排序。快照存活 1 小时且只在同一 MCP 服务进程内有效，进程结束后需重新搜索；单次 CLI 调用不能跨进程复用快照。

调用模型负责最后总结。工具返回逐篇来源、正文、媒体及覆盖说明和总结指引，不需要额外 LLM API key。失败项保留错误，遇登录/风控中止后续读取。数量不足时 `complete:false`，不能声称读满 N 篇。

图片默认提供地址，可用 `xhs_read_note_image` 逐张返回实际图片交给视觉模型阅读，未自动 OCR；视频提供流地址并尝试读取网页公开的中文字幕。没有字幕的视频不会自动语音识别或理解画面，不能仅凭标题声称已看完视频。媒体地址可能过期，需重新读取。内容包含用户正文及签名媒体地址，请勿将真实返回值提交仓库。

大批量建议先搜索再每批读取 3–5 篇，避免 MCP 客户端超时。当前进程内串行执行浏览器操作，不做并发抓取或风控绕过。搜索结果受登录账号、地区和站点排序影响。首页搜索栏提交未跳转时，回退到同一浏览器内的标准网页搜索页，返回 `search_method` 标明路径。

收藏示例：`xhs_list_saved({"site":"rednote","limit":50})`，再将指定条目的 `url` 传给 `xhs_read_note`。工具只读取当前账号收藏页，不将发布页的笔记混入结果。`reported_total` 是网页显示的收藏总数；`returned` 是本次实际取得的不同笔记数；`complete` 表示是否达到请求数量，`reached_end` 表示连续滚动未再出现新条目，不意味着与网页总数一致。大列表可能需要数分钟，请相应延长客户端超时。

首页示例：`xhs_open_home({"site":"xiaohongshu"})` 留下可见标签页，或 `xhs_home_feed({"site":"rednote","limit":10})` 读取海外首页卡片。CLI 对应 `node src/cli.js open-home xiaohongshu` 和 `node src/cli.js home 10 rednote`。不指定 site 沿用配置的默认值；显式指定不会切换到另一站。首页抓取最多 20 次提取、连续 3 次无新卡即停止；`complete:false` 表示没有达到请求数量，不证明已到底。结果按出现顺序去重，`url` 可传给 `xhs_read_note`，签名可能过期，卡片不等于正文。`HOME_UNAVAILABLE` 表示无法验证首页卡片；登录和验证要求需在对应站点处理。

## 命令行与验证

在仓库根目录可直接运行以下命令；`site` 可选 `auto`、`rednote`、`xiaohongshu`。`saved` 和 `home` 若要指定站点，需要先给出数量；`read` 按链接所属站点读取。

```sh
node src/cli.js doctor rednote
node src/cli.js open-home xiaohongshu
node src/cli.js home 10 rednote
node src/cli.js saved 5 rednote
node src/cli.js search '旅行攻略' rednote
node src/cli.js read '分享链接或分享文案'
```

这些命令会连接浏览器，除 `open-home` 保留标签页外，其余读取操作使用临时标签页。下面的自动化检查不需要账号登录：

```sh
npm run check
npm test

```

`PAGE_UNAVAILABLE`：链接加载失败或失效；`NOTE_UNAVAILABLE`：未取得指定笔记全文；`AUTH_REQUIRED`：请在 Chromium 登录；`RATE_LIMITED`：请在 Chromium 完成站点验证后重试；`SEARCH_EXPIRED`：重新搜索。站点 DOM 变化可能需要更新 `src/browser.js` 中的搜索选择器及 `src/extract.js` 中的提取适配。

自动化测试覆盖站点选择、URL 边界、MCP 内存传输及浏览器 DOM 提取。DOM 回归测试使用本机 Chromium，可通过 `CHROMIUM_PATH` 指定路径；找不到浏览器时该项会跳过。

`npm run test:live:rednote` 是可选的真实网络测试：它使用已登录会话读取收藏、笔记、图片及搜索，会在终端输出笔记 ID 和标题。`scripts/live-smoke.mjs` 也会输出真实标题。运行前请确认愿意访问这些数据，并保护终端输出和日志；离线测试不需要登录浏览器。

## 隐私与安全

浏览器配置目录、账号状态、收藏、笔记正文、输出日志和带签名的媒体链接都可能包含敏感信息。不要将它们提交到仓库或分享给不可信的人；只授权可信的 MCP 客户端使用本服务。网页正文是外部不可信数据，不应把其中的指令当作系统或用户指令执行。停止使用时可关闭由自己启动的调试浏览器；删除专用数据目录会丢失其中的登录状态，请先自行确认。

## 许可证

本项目采用 [MIT License](LICENSE)，版权归 Leo Li 所有。第三方依赖各自的许可证不受此声明替代。
