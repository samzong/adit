# Adit — 最终设计文档（DESIGN）

> **文档地位**：本文是项目的唯一权威设计依据。后续所有开发只按本文执行;与本文冲突的旧文档(`design-thin-webview-shell.md`、`proposal-*.md`、`.local/*.md`)一律作废。
> **语言约定**:本文为设计文档,用中文;所有代码、标识符、schema、IPC channel、提交信息、分支名、PR/issue 一律英文。
> **收敛来源**:4 份候选提案 + 3 份独立收敛计划(`.local/claude.md` / `codex.md` / `zcode.md`),并以 M0 实测结论修正。
> **产品名**:**Adit**(repo / binary slug `adit`;原工作名 voice-notes 已弃用)。命名隐喻:adit = 矿井的横向入口,每条笔记是一条"再进入"会话的通道——只存入口,不存正文。
> **最后更新**:2026-06-23

---

## 1. 产品定位

**Adit** 是一个 **macOS 桌面 App**,把散落在 ChatGPT / Grok 网页里的对话,收拢成一份本地"会话笔记列表"。每条笔记 = 一个会话 URL 指针,可随时重新打开续聊。

**它是什么**:AI 会话**入口管理器**(列表 + 新建 + 续聊 + 归档 + 搜索)。
**它不是什么**:不是 AI 笔记编辑器,不是内容归档,不是语音转文字工具,不是模型路由,不是同步/协作工具。

> 核心边界:**入口聚合,不碰正文**。这条边界一旦破,标题、搜索、摘要、导出、模型选择这些伪需求会把项目拖散。

---

## 2. M0 实测结论(门禁已通过 ✅)

M0 Login Spike(`m0-login-spike/`,Electron 42.4.1)已实测,**地基成立**。所有后续工程基于以下**已验证事实**:

| 验证项 | 结果 |
|---|---|
| `WebContentsView` 加载 chatgpt.com / grok.com | ✅ 正常 |
| ChatGPT 邮箱密码登录(嵌入窗口) | ✅ 可登 |
| Grok 邮箱密码登录(经 X,嵌入窗口) | ✅ 可登 |
| cookie 跨 App 重启持久化(`persist:chatgpt`/`persist:grok`) | ✅ 免登录 |
| session URL 捕获(发首条消息后) | ✅ 成功 |
| **ChatGPT 会话 URL 实测格式** | `https://chatgpt.com/c/{uuid}` |
| **Grok 会话 URL 实测格式** | `https://grok.com/c/{uuid}`(与 ChatGPT 同构) |
| Google / Apple SSO(嵌入窗口) | ❌ Google 硬封锁("this browser or app may not be secure"),桌面 Chrome UA 伪装无效 |
| passkey / Touch ID(未签名构建) | ❌ 调不起(Secure Enclave 需签名 + keychain access group) |

**由 M0 锁定的产品约束**:

1. **登录方式 = 邮箱密码**。UI **不引导用户点 Google/Apple SSO**(嵌入式必失败),文案明确"请用邮箱密码登录"。
2. **Grok 登录经由 X**:`x.com/i/oauth2/authorize`,Grok 账号即 X 账号。导航白名单**必须包含 x.com**,否则 Grok 登录流程被拦。
3. **两家 provider 的 session URL 同构**(`/c/{uuid}`),capturer 可用一个按域名参数化的模板。
4. **passkey 推迟到 v2 签名构建**:官方支持自 Electron 42 起(`app.configureWebAuthn`),需 Apple Developer Program 签名 + entitlements;与对外分发的签名/公证顺路一起做(见 §14)。

---

## 3. 已锁定的全局决策

以下为三份收敛计划一致同意 + 分歧裁决后的最终结论,**不再讨论**。

### 3.1 基线共识

1. **平台**:仅 macOS(universal,优先 arm64)。
2. **框架**:Electron(淘汰 Tauri — 系统 WebView 在 macOS 有 Secure cookie 不一致问题 #2490,且对复杂 SPA 兼容性差;本产品核心是承载第三方登录态网页,Chromium 可控性 > 包体积)。
3. **网页承载**:Electron `WebContentsView`。
4. **聚合深度**:入口聚合(只存 URL 指针),**不抓正文**。
5. **存储**:本地 SQLite,单表,不上云、不上传。
6. **Provider**:ChatGPT(`chatgpt.com`)+ Grok(`grok.com`,**非 Groq**)。
7. **不做模型选择**:档位交给 provider 原生 UI,数据模型**不引入 model-tier 字段**。
8. **无删除**:只有归档 ↔ 恢复状态翻转,本地记录与远端 session 都不删。
9. **排序**:主列表 + 归档列表均 `updated_at DESC`。
10. **空白会话丢弃**:没发消息就关 → 不落库,不污染列表。

### 3.2 分歧裁决(及理由)

| 议题 | 裁决 | 理由 |
|---|---|---|
| 网页承载 API | **`WebContentsView`**,禁用 `<webview>` 标签与 `BrowserView` | 后两者 Electron 已废弃/不推荐;`<webview>` 事件与隔离模型易踩坑 |
| 登录态分区 | **`persist:chatgpt` + `persist:grok` 分离** | 隔离更稳:一家 cookie 出问题不波及另一家;存储成本可忽略 |
| 标题抓取 | **`page-title-updated` 事件 + 关闭兜底 + 手动改名**,**不读取 DOM 正文** | 标题只走浏览器事件和 `<title>` 兜底;不读取用户消息或回答内容 |
| Provider 页适配 | **允许 Main 侧受控 adapter(CSS;必要时 JS)** | Adit 是 Electron shell,可做轻量页面适配;边界是不抓正文、不暴露 IPC、不自动替用户操作 |
| "首句 fallback" 标题 | **否决** | 读用户消息文本 = 抓正文,与核心边界自相矛盾 |
| 窗口模型 | **单 shell 窗口,`mode: list \| session` 切换** | 独立会话窗口增加生命周期复杂度,收益小 |
| 标题搜索 | **进 MVP(P0)** | SQL `LIKE` on indexed column,成本极低、价值高 |
| 关闭去重 | **业务层去重 + `session_url` 唯一索引双保险** | 防同一远端会话重复落库 |
| `before-quit` 落库 | **采纳** | 防 Cmd+Q/崩溃丢 in-flight 会话 |
| 全局快捷键/暗色/设置页 | **P1,不阻塞 MVP** | 非核心价值验证项 |

---

## 4. 架构

```
┌──────────────────────────────────────────────────────────┐
│  Electron Main Process                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ NoteStore   │  │ NavWatcher   │  │ SessionManager  │  │
│  │ (SQLite,    │  │ did-navigate │  │ WebContentsView │  │
│  │ better-     │  │ + page-title │  │ + partitions    │  │
│  │ sqlite3)    │  │ per-provider │  │                 │  │
│  └─────────────┘  └──────────────┘  └─────────────────┘  │
│  IPC handlers · window lifecycle · before-quit flush      │
│  · domain allowlist · (P1) global shortcuts               │
├────────────────────────────┬──────────────────────────────┤
│  Renderer: Shell (React)   │  WebContentsView (active)    │
│  list / archive / search   │  原生 ChatGPT 或 Grok 页     │
│  new-note picker / toast   │  轻量 page adapter,无地址栏  │
│  mode: list | session      │  domain allowlist 锁死        │
└────────────────────────────┴──────────────────────────────┘
```

**进程职责**

- **Main**:SQLite 读写、`webContents` 事件监听(URL/标题捕获)、`WebContentsView` 生命周期与 bounds 同步、provider page adapter、IPC handler、cookie 分区、窗口生命周期、`before-quit` 落库、导航白名单。
- **Renderer**:纯 UI(列表/归档/搜索/新建 picker/toast),**只走 IPC,不直连 DB,不操作 provider 页**。
- **Preload**:`contextBridge` 暴露白名单 IPC;**不向 provider 页暴露 Adit IPC**。
- **WebContentsView**:承载 provider 原生页,domain allowlist 锁死。

---

## 5. 状态机(实现必须 state-machine-first)

不要让 UI 事件散落驱动业务。会话生命周期按此状态机实现:

```
idle/list
  ── create(provider) ──▶ creating(provider)
  ── view ready ───────▶ active_ephemeral(provider, session_url = null)
  ── URL captured ─────▶ active_saved(note_id, session_url)   // 立即写 DB
  ── Cmd+W / close ────▶ closing
  ── done ─────────────▶ idle/list
```

**关键规则**

- `active_ephemeral` 关闭时仍无有效 `session_url` → **直接丢弃,不落库**。
- 捕获到有效 `session_url` → 立即进入 `active_saved` 并 **upsert 写 DB**(不等关闭,降低崩溃丢失)。
- `Cmd+W`:关闭当前 session,回 `idle/list`,**App 不退出**。
- `Cmd+Q`:若有 active session,**同步 flush 后再退出**。
- 红点关窗:MVP 按普通关闭处理;"隐藏而非销毁 + 常驻 dock"随全局快捷键一起推迟到 P1。

---

## 6. 数据模型(SQLite,单表)

```sql
CREATE TABLE notes (
  id              TEXT PRIMARY KEY,            -- UUID v4
  provider        TEXT NOT NULL CHECK (provider IN ('chatgpt', 'grok')),
  session_url     TEXT,                        -- 首条消息后才有;NULL = 占位(理论上不落库)
  title           TEXT NOT NULL,               -- 抓取或手动改名;落库时必有(至少时间戳兜底)
  is_title_manual INTEGER NOT NULL DEFAULT 0,  -- 1 = 用户改过;provider 标题不得覆盖
  created_at      INTEGER NOT NULL,            -- Unix ms
  updated_at      INTEGER NOT NULL,            -- 排序键,每次打开刷新
  last_opened_at  INTEGER,                     -- 与 updated_at 解耦,便于"最近打开"独立查询
  archived        INTEGER NOT NULL DEFAULT 0   -- 0/1
);

CREATE INDEX idx_notes_main ON notes(archived, updated_at DESC);
CREATE UNIQUE INDEX idx_notes_session_url
  ON notes(provider, session_url) WHERE session_url IS NOT NULL;  -- 去重物理保证
CREATE INDEX idx_notes_title ON notes(title);                     -- 标题搜索
```

**字段决策**:`session_url`(直白,优于 `session_ref`)、`provider`(精确,优于 `source`)、`archived` 整型(省于 `status` 字符串)、`is_title_manual`(防 provider 标题覆盖手动改名)、`last_opened_at`(来自 C 方案,便宜且有用)。

**不保存**:账号密码、cookie 明文、prompt/answer 正文、provider 账号信息、模型档位、网页内部状态。

**DB 路径**:`~/Library/Application Support/adit/notes.db`(与 cookie 分区同目录,便于备份)。

---

## 7. Provider 抽象

ChatGPT 专用逻辑在 M2 抽成 provider 模块,新增 provider 或 provider 改版只改一处:

```ts
interface ProviderConfig {
  id: 'chatgpt' | 'grok';
  label: string;              // 列表/picker 展示名
  homeUrl: string;            // 新建会话入口 URL
  partition: string;          // persist:chatgpt | persist:grok
  allowedHosts: string[];     // 导航白名单(含 auth 子域)
  sessionUrlPattern: RegExp;  // 捕获会话 ID
  loginUrlPatterns: RegExp[]; // 检测登录态过期
}
```

**实测配置(M0 确认)**:

```ts
// providers/chatgpt.ts
{
  id: 'chatgpt',
  label: 'ChatGPT',
  homeUrl: 'https://chatgpt.com/',
  partition: 'persist:chatgpt',
  allowedHosts: ['chatgpt.com', 'auth.openai.com', 'chat.openai.com'],
  sessionUrlPattern:
    /^https:\/\/chatgpt\.com\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  loginUrlPatterns: [/auth\.openai\.com/, /\/log-?in/],
}

// providers/grok.ts —— 注意:Grok 登录经由 X,白名单必须含 x.com
{
  id: 'grok',
  label: 'Grok',
  homeUrl: 'https://grok.com/',
  partition: 'persist:grok',
  allowedHosts: ['grok.com', 'x.com', 'accounts.x.com'],
  sessionUrlPattern:
    /^https:\/\/grok\.com\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  loginUrlPatterns: [/x\.com\/i\/(oauth2|flow\/login)/, /\/log-?in/],
}
```

> 两家 `sessionUrlPattern` 同构,实现可共用 `sessionUrlPatternFor(host)` 模板。正则全部单测覆盖。

---

## 8. 核心流程

### 8.1 新建会话 + URL 捕获

1. 选 provider → 创建 `WebContentsView`(对应 partition,桌面 Chrome UA)→ 加载 `homeUrl` → 进入 `active_ephemeral`。
2. `NavWatcher` 同时监听 `did-navigate`(完整跳转/登录重定向)与 `did-navigate-in-page`(SPA `pushState`,`/c/{uuid}` 走这个)。
3. URL 命中 `sessionUrlPattern` → upsert(按 `(provider, session_url)` 去重:存在则 UPDATE,否则 INSERT)→ `active_saved`。
4. 关闭时仍无 `session_url` → 丢弃。

### 8.2 续聊

点列表项 → 用 `session_url` 在 `WebContentsView` 加载 → 续聊。打开即刷新 `updated_at` + `last_opened_at`("看过"也算一次使用,不判断是否真的发消息)。

### 8.3 标题

优先级:**① 手动重命名(`is_title_manual=1`,锁定不被覆盖)→ ② `page-title-updated` 事件 → ③ 关闭时再读一次 `<title>` 兜底 → ④ fallback `Untitled · {YYYY-MM-DD HH:mm}`**。

### 8.4 登录态过期

URL 命中 `loginUrlPatterns` → Renderer toast"登录已过期,请重新登录"。不做特殊 re-auth(符合非目标)。

### 8.5 归档 / 退出安全

- 归档:仅翻转 `archived`,必须可还原。
- `before-quit`:有 in-flight 且已捕获 URL → 同步落库再退出。

---

## 9. 安全边界(provider 页 = 不可信远端)

```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  // webSecurity 保持开启
}
```

- 不向 provider 页暴露文件系统 / IPC / 可执行回调。
- 导航与新窗口走 `allowedHosts` 白名单;`setWindowOpenHandler` 仅按需放行(OAuth popup 行为已在 M0 观测)。
- 所有 IPC handler 在 Main 端校验参数,Renderer 与 provider 页均视为不可信输入源。

**Provider page adapter 边界**

允许在 Main 侧按 provider 配置对远端页面做轻量适配,因为 Adit 的产品价值就是把原生网页装进本地 shell 后补齐本地体验。当前允许项:

- `insertCSS`:布局、隐藏无关 chrome、主题适配、避免闪烁。
- `insertJavaScript`:仅在有明确产品需求时使用,必须保持 provider-scoped、idempotent、可删除。

硬边界:

- 不读取 prompt / answer / 聊天列表等正文内容。
- 不抓 cookie、localStorage、账号信息或 provider 内部 token。
- 不向 provider 页面暴露 Adit IPC、文件系统或可执行回调。
- 不用轮询或无界 `MutationObserver`;需要 DOM 监听时必须有窄 selector、生命周期清理和性能理由。
- 不自动替用户提交消息、付款、授权、删除或分享等第三方副作用操作。

---

## 10. IPC 接口(最小集)

`contextBridge` + `ipcRenderer.invoke`(双向,可 await/try-catch);channel 名集中在 `src/shared/ipc.ts`。

**Renderer → Main(invoke)**

| Channel | 用途 |
|---|---|
| `notes:list` | 拉主列表 / 归档列表 / 标题搜索 |
| `notes:rename` | 手动重命名(置 `is_title_manual=1`) |
| `notes:archive` / `notes:unarchive` | 归档 / 恢复 |
| `session:create` | 新建 provider 会话 |
| `session:open` | 打开已有 note |
| `session:close` | 关闭当前 session 并 flush |
| `session:state` | 拉当前状态机状态 |

**Main → Renderer(event)**

| Event | 用途 |
|---|---|
| `notes:changed` | DB 写入后刷新列表 |
| `session:title-updated` | 标题更新 |
| `session:login-required` | 登录过期提示 |
| `app:toast` | 通用提示 |

> 调试用 channel(如 `session:current-url`)只放 dev-only,不进正式 preload。

---

## 11. 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 运行时 | **Electron(最新稳定版,当前 42.x)** | 42+ 起带 passkey 支持(v2 用) |
| 网页承载 | `WebContentsView` | 现行 API |
| 构建 | electron-vite + electron-builder | 社区主流 |
| 语言 | TypeScript 5.x | 全栈类型安全 |
| Shell UI | React 18 + Tailwind 3 | 列表型 UI |
| 状态 | Zustand | 轻量 |
| 数据库 | better-sqlite3 11.x | 同步 API,桌面最稳 |
| 包管理 | pnpm | — |
| 测试 | Vitest | capturers 正则、DB helper 必测 |
| 日志 | electron-log | 文件日志 |

> **安装注意**:本机环境下 electron 的 `extract-zip` postinstall 可能卡住(dist 远小于完整体积),用 `ditto` 兜底解压 + 手写 `path.txt`(详见 `m0-login-spike/README.md`)。pnpm 11.7 的 build 批准放在 `pnpm-workspace.yaml`。

---

## 12. MVP 功能清单

| ID | 功能 | 优先级 |
|---|---|---|
| F1 | 新建会话 — ChatGPT/Grok picker | P0 |
| F2 | Chromeless `WebContentsView`,单窗口单会话 | P0 |
| F3 | 分离 partition 登录持久化 | P0 |
| F4 | SPA URL 捕获(per-provider 正则 + 单测) | P0 |
| F5 | 标题抓取(事件 + 关闭兜底 + 手动改名,`is_title_manual` 锁定) | P0 |
| F6 | 笔记列表(`updated_at DESC`,1000 条虚拟化) | P0 |
| F7 | 续聊(loadURL 原 `session_url`,免登录) | P0 |
| F8 | Cmd+W 关闭回列表,App 不退出 | P0 |
| F9 | 归档 + 恢复(无删除) | P0 |
| F10 | 标题搜索(主列表 + 归档) | P0 |
| F11 | 关闭去重 + `before-quit` 落库 | P0 |
| F12 | Cookie 过期检测 + toast | P0 |
| F13 | 空白会话丢弃 | P0 |
| F14 | 空态 / 加载态 / 错误态 UI | P0 |
| F15 | 入口记忆(上次选的 provider) | P1 |
| F16 | 全局快捷键 `Cmd+Shift+V` | P1 |
| F17 | 暗色模式(跟随系统) | P1 |
| F18 | 设置页(快捷键、关于) | P1 |
| F19 | passkey 登录(需签名构建,见 §14) | v2 |

**交互裁决**:`Cmd+W` 回列表;`Cmd+Q` 落库后退出。

---

## 13. 非目标(明确不做)

删除、多窗口/多 tab、云同步/多设备、团队协作、ASR(复用 superwhisper/系统听写)、自建模型/接 API、正文抓取/全文搜索/导出、自动摘要、标签分类、自动模型选择、自动操作第三方网页、DOM 注入、App 账号体系、Windows/Linux/iOS。

---

## 14. 性能指标(非功能验收线)

- 冷启动 < 1s(App 本身,不含 WebView 加载)
- 1000 条笔记列表流畅滚动(必要时 `react-window`)
- 空闲内存 < 300MB
- 安装包 < 200MB

---

## 15. 里程碑

| 阶段 | 目标 | 验收(可勾选) | 状态 |
|---|---|---|---|
| **M0 — Login Spike(门禁)** | 实测嵌入式登录 + cookie 持久化 + URL 捕获 | ☑ 密码登录通(两家) ☑ cookie 跨重启存活 ☑ URL 捕获 + 重开 ☑ Google SSO 不可行(已知) | **✅ 完成(2026-06-23)** |
| **M1 — 单 provider 闭环(ChatGPT)** | 新建→捕获→close-to-save(含 dedup)→列表→resume | ☐ 完整闭环跑通 ☐ 空会话不落库 ☐ `before-quit` 落库 | 待开始 |
| **M2 — Provider 抽象 + Grok** | M1 路径抽成 `ProviderConfig`,接 Grok | ☐ 两家可新建/捕获/恢复 ☐ partition 隔离 ☐ capturer 改版只改一处 | — |
| **M3 — 列表可用性** | 标题/改名、归档/恢复、搜索、空/载/错态、过期 toast | ☐ 手动标题不被覆盖 ☐ 搜索只搜标题 ☐ 1000 条流畅 | — |
| **M4 — 硬化 + 内测包** | 日志、错误提示、unsigned DMG、README、dogfood | ☐ 自用无明显丢数据/崩溃 | — |
| **v2 — 签名发布 + passkey** | Apple Developer ID 签名 + notarization;`app.configureWebAuthn` 开 passkey | ☐ 公证通过 ☐ Touch ID passkey 可用 | — |

> M0 已通过,直接进 M1。实现仓库 = `~/git/samzong/adit`(electron-vite + TS);`m0-login-spike/` 是一次性 spike,不并入正式架构,但其验证过的 capturer 正则 / partition / UA 设置可移植。

---

## 16. 测试 / 验证策略

| 阶段 | 必测 |
|---|---|
| M1 | Vitest:ChatGPT URL capturer、DB upsert、空 session 丢弃、`Cmd+Q` flush |
| M2 | Vitest:Grok capturer、provider allowlist |
| M3 | DB 查询、rename 不被覆盖、archive/unarchive |
| UI | 改动必须跑真 App 并截图确认 list/session/空/错 四态 |

**测试优先级**:① URL capturer ② DB upsert/dedupe ③ 状态机 close/quit flush ④ IPC 参数校验。

---

## 17. 签名与发布(v2)

- **要分发**:加入 **Apple Developer Program($99/年)** → Developer ID Application 证书 → electron-builder 配置签名 + **notarization(公证)** → 用户下载不被 Gatekeeper 拦。
- **要 passkey**:`app.configureWebAuthn({ touchID: { keychainAccessGroup } })`,keychain access group 绑 Team ID,**必须签名 + entitlements**。
- **顺路**:签名同时满足"分发公证"与"passkey",v2 一并做。
- **MVP(M4)**:不签名,unsigned DMG + README 注明右键打开。
- 备选:第三方原生模块 `@electron-webauthn/native`(Vault12,AuthenticationServices polyfill)可在更早阶段补 passkey。

---

## 18. 风险登记

| # | 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|---|
| R1 | 嵌入式 SSO 被拒 | 高 | 存亡级 | **M0 已确认**:弃用 SSO,走密码;UI 不引导点 Google |
| R2 | Cloudflare/bot 风控嵌入浏览器 | 中 | 高 | 桌面 Chrome UA;M0 未触发,持续观测 |
| R3 | Provider URL/标题改版 | 中 | 中 | capturer 模块隔离 + 单测,改版只改一处 |
| R4 | Cookie 过期 | 高(必然) | 中 | 登录页 URL 检测 + toast |
| R5 | 标题延迟/不可用 | 高 | 低 | 关闭兜底 + 手动改名 + 时间戳 |
| R6 | Grok 登录依赖 x.com 链路变动 | 中 | 中 | 白名单含 x.com;`loginUrlPatterns` 单点维护 |
| R7 | Cmd+Q/崩溃丢 in-flight 会话 | 低 | 高 | `before-quit` flush;upsert-on-capture |
| R8 | 未签名 Gatekeeper 拦截 | 高(MVP) | 中 | README 右键打开;v2 notarize |
| R9 | ToS(外壳包裹 provider 网页) | 低(自用)/中(分发) | 中 | 自用先行;分发前审 OpenAI/xAI 条款 |
| R10 | session_url 失效(provider 删档) | 低 | 低 | resume 失败降级为新建,保留笔记元数据 |
| R11 | 范围膨胀 | 高 | 中 | P1/v2 一律不进 M1–M3 |

---

## 19. 目录结构(实现仓库)

```
adit/
├── package.json
├── electron.vite.config.ts
├── electron-builder.yml
├── pnpm-workspace.yaml
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   ├── window.ts
│   │   ├── session-view.ts        # WebContentsView 生命周期 + bounds
│   │   ├── nav-watcher.ts         # did-navigate(-in-page) → 捕获
│   │   ├── providers/             # ProviderConfig:chatgpt.ts / grok.ts / index.ts
│   │   ├── capturers/             # URL 正则 + 单测(可并入 providers/)
│   │   ├── db/                    # connection.ts / schema.sql / notes.ts
│   │   └── ipc/                   # index.ts / notes.ts / sessions.ts
│   ├── preload/                   # 仅暴露白名单 IPC,不注入 provider 页
│   ├── shared/                    # types.ts / ipc.ts(channel 名 + 类型)
│   └── renderer/                  # App.tsx / components / stores / styles
└── resources/                     # icon.icns / icon.png
```

> 本 `docs/DESIGN.md` 随实现仓库 `adit` 一起存放,是该仓库的权威规格。

---

## 20. 决策记录(被否决项)

- **`<webview>` 标签 / `BrowserView`**:Electron 已废弃/不推荐 → 统一 `WebContentsView`。
- **Tauri**:核心是复杂第三方登录态网页,Chromium 可控性优先 → Electron。
- **共享 partition**:隔离更稳 → 分离 `persist:chatgpt`/`persist:grok`。
- **MutationObserver DOM 注入抓标题**:ToS 风险 + 脆弱 → `page-title-updated` 事件。
- **"首句 fallback" 标题**:违反"不抓正文" → 删除。
- **独立会话窗口**:复杂度高收益小 → 单窗口模式切换。
- **自动模型选择**:provider 页内状态,不可靠 → 不做。
- **先做漂亮 UI / 全局快捷键 / 设置页 / 自动更新**:非核心价值验证项 → 后置。

---

## 21. 开放问题

**已定**:产品名 **`adit`**(原 voice-notes)/ Grok(非 Groq)/ 仅 macOS / 不承诺模型档位 / 手动改名(P0)/ 归档可恢复 / 空会话丢弃 / 实现仓库 `~/git/samzong/adit`。

**待定**:
1. 本地索引导出(JSON/CSV)—— MVP 不做,需求积累后再评估。
3. v2 passkey:用官方 `app.configureWebAuthn`(需升级保持 42+)还是 Vault12 原生模块?(签名落地时再定)
