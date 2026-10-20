# 「公道钟馗」HTML5 → Google Play App 封装工程文档

**文档版本**: V1.0
**编制日期**: 2026-10-07
**适用对象**: Android 封装开发、测试、上架运营
**输入文档**: `公道钟馗_PRD_V1.0.md`、`开发计划_公道钟馗.md`、`index.html`（MVP 单文件实装）
**文档目的**: 以现有 `index.html` 为基线，梳理真实实现现状，给出封装为 Google Play 可上架 App 的工程方案、改造清单、稳定性预算与上架合规清单。

---

## 1. 现状盘点：实际实现 vs PRD/开发计划

### 1.1 index.html 实际实现（代码事实）

| 维度 | 实际实现 | 代码位置 |
|------|----------|----------|
| 形态 | 单文件 SPA，6 个 `.page` 视图切换（`showPage()`），无路由、无构建 | `showPage()` |
| 页面 | 首页 homePage / 登录 loginPage / 个人中心 userCenterPage / 演卦 drawPage / 结果 resultPage / 问卦志 historyPage | body 412–598 行 |
| 核心玩法 | **六爻金钱课问卦**：选问事分类 → 摇龟壳 → 6 次掷 3 枚铜钱 → 生成本卦/变卦 → 判词详解 | `tossCoins()` / `judgeYao()` |
| 卦象数据 | 内置 64 卦表（name/sequence/text/comment/imagePath），`Math.random()` 生成铜钱正背 | `STANDARD_GUA`（686 行起） |
| 手势模式 | MediaPipe Hands（jsdelivr CDN 动态加载）+ camera_utils/drawing_utils；状态机 idle→shake→toss→sword→result_zoom | `onHandResults()`（1308 行） |
| 手势细节 | shake=握拳且腕部位移>0.06；toss=握拳→张开；sword=食中指并拢亮剑指开结果；result_zoom=拇食指捏合缩放卡牌+粒子特效（EMA 平滑） | 1308–1386 行 |
| 账号体系 | 纯本地：账号密码存 `localStorage.zhongkuiUsersDB`（**明文密码**），会话存 `zhongkuiCurrentSession` | `handleLogin/handleRegister` |
| 商业化闸门 | 游客仅 1 次试玩（`zhongkuiHasUsedTrial`）；登录用户须 `hasAddedWeChat=true`（扫码加企业微信弹窗自助确认） | 1398–1422 行 |
| 历史记录 | 最多 50 条，存 localStorage（游客 `zhongkuiGuestHistory` / 登录用户挂账号下） | `showResult()` 1041 行 |
| 分享 | 仅静态弹窗展示小红书/抖音/X/企业微信二维码，**无系统分享能力** | shareModal 628 行 |
| 外部资源 | 相对路径图片：`底图.png`、`cards/卡片.png`、`工厂2.0/1.png`–`64.png`（64 卦卡面）、4 张二维码图 | CSS 20 行、530/552/619/635 行等 |
| 无 | 后端、支付、埋点、音效、Service Worker、分享 SDK、稀有度抽卡体系 | — |

### 1.2 与 PRD 的关键偏差（封装前必须对齐）

| PRD 设计 | MVP 现状 | 对上架的影响 |
|----------|----------|--------------|
| 抽卡+稀有度（普通70%/稀有20%/史诗8%/传说2%）+保底 | 实装为六爻问卦，无稀有度抽卡 | 无概率公示义务风险，但商店描述不得宣传"抽卡概率" |
| 微信支付/灵力值充值 | 无任何支付 | Google Play 无 IAP 合规负担；若后续加付费，须走 Play Billing |
| 微信 OAuth 登录 | 本地明文账号 | **安全红线**：上架前必须改造（见 §4.2） |
| 2 组×3 枚铜钱生成卦象 | 6 次×3 枚（标准六爻） | 以实装为准，文档/商店文案按六爻描述 |
| 每日免费 3 次 | 游客 1 次 + 加微信解锁无限 | 转化闸门逻辑封装后可保留，属产品决策 |
| iOS 12+/Android 8+、微信浏览器主战场 | 纯 H5 | 封装后主战场变为 Google Play 安卓端，需补摄像头在 WebView 内的授权链路 |

**结论**：当前 index.html 是一个**纯前端、可离线、含摄像头手势交互的六爻占卜单页应用**。封装工作的本质是：WebView 容器 + 资源本地化 + 摄像头权限链路 + 本地数据加固 + Play 上架合规。

---

## 2. 封装方案选型

| 方案 | 说明 | 优点 | 缺点 | 结论 |
|------|------|------|------|------|
| **A. 原生 WebView 壳**（Kotlin + WebView） | Android Studio 工程内嵌 assets 资源 | 包体最小、完全离线、无第三方框架依赖、摄像头权限可控 | 需手写 JS Bridge（如需原生分享/返回键） | **推荐（MVP 上架）** |
| B. Capacitor/Cordova | 混合框架封装 | 插件生态（分享、推送、IAP）现成 | 引入构建链与框架升级维护成本 | 二期需 IAP/推送时再评估 |
| C. TWA（Bubblewrap） | 需把游戏部署到 HTTPS 域名 + Digital Asset Links | 无 WebView 兼容问题、可复用 PWA | 依赖线上托管与域名资质，离线弱，MediaPipe CDN 依赖仍在 | 不推荐（资源未托管、资质未备） |

**选定方案 A**：单个 `assets/www/` 目录承载全部资源，WebView 加载 `file:///android_asset/www/index.html`。

**关键技术点——安全上下文**：`getUserMedia` 与 MediaPipe 需要 Secure Context。`file://` 在 WebView 中非默认安全源，两条路任选：
1. `WebViewAssetLoader` 将资源映射为 `https://appassets.androidplatform.net/`（**推荐**，Google 官方方案，天然安全上下文）；
2. 或 `webView.getSettings().setMediaPlaybackRequiresUserGesture(false)` + `onPermissionRequest` 中 `grant()`，并放行不安全源的摄像头（有审核与兼容风险，不建议）。

---

## 3. 目标 App 工程规格

| 项 | 规格 | 备注 |
|----|------|------|
| 应用名 | 公道钟馗 | 商店展示名 |
| 包名 | 建议 `com.<公司域>.gongdaozhongkui` | 一经上架不可更改 |
| 构建格式 | **AAB（Android App Bundle）** | Play 强制 |
| minSdk | 26（Android 8.0） | 对齐 PRD 兼容目标 |
| targetSdk | **35（Android 15）** | Google Play 新应用强制要求 |
| 权限 | `CAMERA`（运行时申请）、`INTERNET`（仅当保留 CDN 回退时需要） | 不申请多余权限 |
| 签名 | Play App Signing（Google 托管）+ 本地 upload key 妥善备份 | upload key 丢失可申诉重置，但流程繁琐 |
| 架构 | arm64-v8a 必须 | MediaPipe 模型为 WASM，无原生 so |
| 版本策略 | versionCode 单调递增；versionName 语义化（1.0.0 起） | — |

---

## 4. 封装前改造清单（按优先级）

### 4.1 P0 — 不上车不能上架

| # | 改造项 | 现状问题 | 目标 |
|---|--------|----------|------|
| 1 | **MediaPipe 资源本地化** | hands/camera/drawing/control 四个 js 及 `.tflite/.wasm` 模型均从 jsdelivr CDN 加载；离线/弱网下手势模式全灭，且 CDN 不可达即功能缺失 | 将 `@mediapipe/hands` 全部模型文件与 js 下载至 `assets/www/vendor/mediapipe/`，`locateFile` 改指本地路径 |
| 2 | **图片资源归集** | `底图.png`、`工厂2.0/*.png`、`cards/卡片.png`、二维码图散落相对路径 | 全部打入 `assets/www/`，核对 64 卦图完整（当前仅确认 index 1–46+，需清点 64 张齐全） |
| 3 | **账号密码安全** | localStorage 明文存密码 | 最低改造：SHA-256+盐 哈希存储；建议：封装期改为设备本地档案（无账号）或直接预留后端接口 |
| 4 | **摄像头权限链路** | H5 依赖浏览器弹窗，WebView 中默认拒绝 | 实现 `WebChromeClient.onPermissionRequest` → 转发 Android 运行时权限 → `request.grant()`；被拒时引导系统设置 + 降级点击模式（PRD 既有要求） |
| 5 | **返回键与生命周期** | SPA 无历史栈，实体返回键直接退 App；切后台摄像头不停 | JS Bridge 拦截返回键→页内返回（showPage 回退）；`onPause` 调 `stopGestureCamera()`，`onResume` 提示继续（对齐 PRD 异常流程"后台切换"） |
| 6 | **隐私政策与权限说明** | 无 | 应用内首次启动展示《隐私政策》《用户协议》，摄像头用途前置说明（PRD 5.2.2 要求）；Play Console 需可访问的隐私政策 URL |
| 7 | **免责声明** | PRD 要求"仅供娱乐"声明，实装未见 | 首页或结果页固定展示："本产品仅供娱乐，占卜结果不代表真实预测" |

### 4.2 P1 — 体验与稳定性

| # | 改造项 | 说明 |
|---|--------|------|
| 8 | 离线兜底 | 资源全本地后天然离线可用；增加"手势模式不可用（无摄像头/无权限）自动切点击模式"的启动探测（PRD 4.2.1 异常流程） |
| 9 | WebView 配置 | 禁用缩放已随 viewport；开启 DOM Storage（localStorage 必需）；`setWebContentsDebuggingEnabled(false)`（Release） |
| 10 | 防误触 | 抽卡过程防抖已有（tossBtn disabled）；补充结果页双击缩放冲突处理 |
| 11 | 手势性能降级 | 帧率低/设备弱时提示切点击模式（PRD：fps<15 提示） |
| 12 | 崩溃与 ANR 监控 | 接入 Play 原生 Android Vitals 即可满足 MVP；不引入带隐私风险的第三方 SDK |

### 4.3 P2 — 二期能力（不在本次封装范围）

系统分享（替换二维码弹窗）、图鉴/成就、IAP（Play Billing，若引入则触发 Play 抽成与额外合规）、推送、后端账号体系。

---

## 5. 发布工程（移动发布稳定性规范）

### 5.1 发布轨道与分阶段放量

| 阶段 | 轨道 | 范围 | 放量/观察标准 |
|------|------|------|----------------|
| 1 | Internal testing | 开发+产品（≤100 人） | 全流程可走通，手势模式可用 |
| 2 | Closed testing | 种子用户（国风圈层，数百人） | **Play 要求新个人开发者账号封闭测试≥14 天且≥12 名测试者**（企业账号无此限） |
| 3 | Open testing / 正式灰度 | 正式轨道 10% | 观察 ≥72h，达成 §5.2 预算后放量 50% → 100% |
| 4 | 全量 | 100% | 进入长尾监控 |

### 5.2 稳定性预算（每 24h 观察窗，未达标即暂停放量）

| 指标 | 阈值（暂定默认值） | 数据来源 |
|------|--------------------|----------|
| 崩溃-free 用户 | ≥ 99.5% | Android Vitals |
| 崩溃-free 会话 | ≥ 99.9% | Android Vitals |
| ANR 率 | ≤ 0.47%（Play 红线）且不劣于基线+10% | Android Vitals |
| 启动成功率 | ≥ 99%（WebView 加载首屏完成） | 自埋点/Vitals |
| 核心旅程完成率（进入→起卦→结果页） | ≥ 80%（对齐 PRD 数据目标） | 自埋点 |
| 手势识别成功率 | ≥ 85%（对齐 PRD） | 自埋点（匿名聚合） |

### 5.3 分段维度

设备内存档位（≤2GB 重点观察 MediaPipe WASM 内存压力）、Android 版本（8/10/12/14/15）、GPU/WebView 实现（Chrome WebView vs 厂商定制）、前置摄像头有无、地区网络（若保留任何在线资源）。

### 5.4 兼容与环境目标校验

- **客户端自持性**：本应用无自有后端，不存在"服务端回滚但客户端状态残留"风险；唯一外部依赖为 MediaPipe CDN，P0 改造#1 完成后外部依赖清零。
- **本地数据迁移**：`zhongkuiUsersDB` 等 localStorage key 一旦发布即冻结命名，后续版本升级需做 schema 兼容（如给 `hasAddedWeChat` 之类字段留默认值路径，实装已有此兼容写法，保持）。
- **环境目标**：Release 包内不得残留任何调试/测试地址；确认 vConsole 类调试工具不进入 Release。

### 5.5 离线与降级测试矩阵

| 场景 | 预期 |
|------|------|
| 飞行模式启动 | 全部功能可用（P0#1 完成后） |
| 无/坏摄像头设备 | 自动点击模式，提示友好 |
| 摄像头权限拒绝 | 24h 内不再骚扰，点击模式可用（PRD 规则） |
| 抽卡中途切后台/来电 | 摄像头暂停，返回后提示"是否继续" |
| 弱设备掉帧 | 提示切点击模式，不卡死 |

### 5.6 熔断与修复路径

- **Kill switch**：MVP 无远程配置，唯一可控手段是 Play Console **暂停发布/Halt rollout**；二期引入远程开关控制手势模式默认启停。
- **回滚限制**：商店无法强制降级 → 所有修复默认**前向修复**（hotfix 版本+加速审核通道预案）。
- **前向修复 SLA**：崩溃预算击穿 → 24h 内提 hotfix；Play 审核通常数小时–2 天，预留缓冲。

### 5.7 隐私安全遥测清单（摄像头应用红线）

| 项 | 要求 |
|----|------|
| 视频帧 | **仅本地处理，绝不上传**（PRD 5.2.2；实装已是本地推理，保持） |
| 崩溃日志 | 不含用户账号、问卦内容、设备精确标识 |
| 埋点 | 匿名 ID，聚合指标即可；问卦具体问题文本不上报 |
| Data Safety 表单 | 据实勾选"摄像头-不收集（仅设备端处理）" |
| 符号化 | Release 保留 mapping/符号文件用于堆栈还原 |

---

## 6. Google Play 上架清单

| # | 事项 | 状态要求 |
|---|------|----------|
| 1 | Play 开发者账号（$25，企业账号需提供邓白氏编码） | 待办 |
| 2 | 商店素材：图标 512×512、置顶大图 1024×500、手机截图≥2 张（建议加 7"/10" 平板） | 待设计（可复用 64 卦卡面与国风视觉） |
| 3 | 应用分级问卷（IARC） | 占卜娱乐类，注意如实申报 |
| 4 | 隐私政策 URL（必须，因使用 CAMERA 权限） | 待办 |
| 5 | Data Safety 表单 | 按 §5.7 填写 |
| 6 | 目标受众与内容设置 | **不得定向儿童**；含未成年人提示语（PRD 既有声明） |
| 7 | 合规声明：非赌博（无现金输赢、无真钱博彩）、概率说明（当前无付费抽取，若加付费抽卡需公示概率） | 商店文案规避"赌博/赢钱"字样 |
| 8 | 中国区资质（ICP/文网文）与 Google Play 上架无直接关系，但若面向国内分发渠道另需 | 备注 |
| 9 | 新闻/占卜类目选择：娱乐（Entertainment） | — |
| 10 | AAB 上传 + 版本说明（中/英） | 待办 |

---

## 7. 里程碑计划

| 阶段 | 内容 | 出口标准 |
|------|------|----------|
| M1 封装改造 | §4.1 P0 七项完成 | 本地构建 APK 全流程走通（含手势） |
| M2 测试 | §5.5 矩阵 + 3 档设备真机 | 无阻塞 Bug，崩溃-free 会话 100%（内部） |
| M3 封闭测试 | Closed track ≥14 天 | 达成 §5.2 预算，收集种子反馈 |
| M4 上架 | 素材/合规齐套，提交审核 | 审核通过，10% 灰度 |
| M5 全量 | 72h 观察达标后放量 | 100%，进入维护期 |

---

## 8. 风险登记

| 风险 | 等级 | 缓解 |
|------|------|------|
| MediaPipe 模型体积（~10MB+ WASM/模型）导致包体/内存压力大 | 中 | 本地化后按需加载；AAB 分包；低端机默认点击模式 |
| 64 卦卡面图片未全部就绪（代码引用 `工厂2.0/N.png`） | 高 | 打包前逐张清点，缺失则补图或加 onerror 占位 |
| 摄像头权限被 Play 审核关注 | 中 | 权限用途前置说明 + 点击模式替代路径 + Data Safety 如实申报 |
| 明文密码若不改，属安全/审核隐患 | 高 | P0#3 必须完成 |
| 占卜类目政策变动 | 低 | 保持"娱乐免责声明"，关注 Play 政策中心 |
| 个人开发者账号封闭测试人力不足 12 人 | 中 | 提前招募测试社群，或注册企业账号 |

---

**附：源文件索引**
- 实装：[index.html](file:///workspace/.uploads/1546b58f-9e33-42ff-a058-9a4ba6214afa_index.html)
- 需求：[公道钟馗_PRD_V1.0.md](file:///workspace/.uploads/f92b7f73-c6a9-4c9a-87b3-045d5578c8aa_公道钟馗_PRD_V1.0.md)
- 计划：[开发计划_公道钟馗.md](file:///workspace/.uploads/51e36ca2-5d6a-45ae-bfc9-3b0eb294ba5a_开发计划_公道钟馗.md)
