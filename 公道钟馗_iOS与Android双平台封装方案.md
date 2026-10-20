# 公道钟馗 iOS / Android 双平台封装与上架方案

**方案版本：** V1.1  
**编制日期：** 2026-10-10  
**基线文件：** `index_0625_1906.html`、`zhongkui-min_0625.js`  
**目标商店：** Apple App Store、Google Play  
**推荐路线：** 一套本地 Web 业务层 + Capacitor 双原生壳 + StoreKit 2 / Google Play Billing + 轻量权益校验服务

> 本文是可执行的产品、工程、支付、隐私和上架方案，不构成特定司法辖区的法律意见。商店政策会持续更新，每次提审前应再次核对官方政策。

## 1. 结论

`index_0625_1906.html` 适合改造成混合应用，但不适合原样套壳提交。建议以现有 `app` 目录为迁移基础，重构为统一 Capacitor 工程，同时生成 `ios` 与 `android` 两个平台目录。

> **iOS 前置风险：** Apple Guideline 4.3(b) 明确将 fortune telling（算命/占卜）列为已有大量应用的类别，只有提供有实质差异或明显改进体验的新应用才可能获准上架。原生分享、震动、内购或改名为“文化娱乐”本身不足以满足这一要求。应先完成产品差异化评估，再投入完整 iOS 开发；任何封装方式均不能保证审核通过。

首发商业模式建议保持简单：

- 游客可免费完整体验 1 次；
- 用一次性非消耗型内购解锁“无限演卦与本地卦志”；
- iOS 首发统一使用 Apple In-App Purchase；
- Android 的 Google Play 版本首发统一使用 Google Play Billing；
- 首发不在应用内展示微信付款、二维码付款、激活码购买、网页收款或外部购买引导；
- 首发取消本地账号密码，改为“无账号、本机档案、商店恢复购买”，从根源上减少安全、账号删除与隐私负担。

上述支付方式是本方案面向多地区发布的默认策略，并非对所有地区支付规则的绝对描述。Apple 美国区等存在外部购买链接规则，其他地区及 Google Play 的替代结算等安排也须单独评估资格、适用范围和履约义务；首发暂不采用。

该路线可大量复用 HTML/CSS/JS，并降低支付、安全和隐私风险，但不能消除 Apple 4.2 的最低功能要求、4.3(b) 的类别差异化要求或当地内容监管风险。

## 2. 当前文件的实际审计结论

### 2.1 可以复用的部分

- 单页应用交互、六爻逻辑、64 卦数据、点击模式和结果页可直接迁移；
- `工厂2.0` 内已有 1–64 的完整 WebP 卡牌和背面图；
- 页面已有 safe-area CSS，可继续适配刘海屏和底部手势区域；
- 手势模式使用 MediaPipe Hands，技术上可在 WKWebView 与 Android WebView 内运行；
- 现有 `app` 目录已经包含 Capacitor 8、Android 原生工程、本地化 MediaPipe 文件、系统分享和 Google Play 内购原型；
- Android 当前已配置 `targetSdkVersion 36`、AAB 工程和 Billing 插件，能作为工程基础。

### 2.2 必须先整改的上架阻断项

| 问题 | 当前事实 | 处理要求 |
|---|---|---|
| 手势资源依赖公网 | 原 HTML 从 jsDelivr 加载 MediaPipe，`locateFile` 也指向 CDN | 所有 JS、WASM、TFLite、binarypb 本地打包，发布包不依赖 CDN |
| 本地明文密码 | `zhongkuiUsersDB` 将账号和密码写进 localStorage | 首发删除账号体系；若以后做云账号，必须使用后端认证，绝不自行保存密码 |
| 外部解锁路径 | 原 HTML 以企业微信二维码、激活码解锁数字功能 | 按首发统一商店支付策略全部删除；地区例外留待后续专项评估 |
| 权益容易被篡改 | Android 原型用 `zhongkuiPremiumUnlocked=true` 本地解锁 | 本地仅作缓存，商店交易/服务端验证才是权益事实来源 |
| 占位图片缺失 | 原 HTML 引用 `cards/卡片.png` 和 `卡片.png`，根目录均不存在 | 改用已存在的 `工厂2.0/背面.webp`，并添加资源完整性测试 |
| 隐私政策不完整 | 现有文本缺主体名称、真实联系方式、保存期限、支付与删除细节 | 重写中英文政策并部署到长期可访问的 HTTPS URL |
| Android 备份开启 | Manifest 当前 `android:allowBackup="true"` | 卦志含用户私密问题，默认禁用备份或用 data extraction rules 排除敏感数据 |
| 签名材料在工程目录 | 当前存在 `keystore.properties` 与 `zhongkui.keystore` | 移到工程外安全保管并忽略；如已泄露，先区分上传密钥与应用签名密钥，再按平台支持的方式重置/升级，不直接删除旧密钥 |
| iOS 工程缺失 | `app/ios` 不存在 | 在 macOS/Xcode 环境生成、签名和测试 iOS 工程 |
| WebView 套壳风险 | 核心界面几乎完全是网页 | 补齐权限、分享、生命周期、离线能力和设置页，并形成超出网页包装的实际产品价值；原生控件数量不是审核标准 |
| iOS 类别饱和风险 | 核心功能属于 4.3(b) 明确提及的 fortune telling 类别 | 产品差异化先行评估；仅换皮、接入原生能力或添加免责声明不能保证获准 |

### 2.3 内容本身的合规风险

应用涉及占卜，并包含健康、财运、事业等问题分类。商店文案和结果文案不得宣称真实预测、保证结果或替代专业建议。必须做到：

- 首页首次使用、结果页和设置页均展示“仅供文化娱乐与自我反思”；
- 健康内容明确“不构成医疗建议”；财运内容明确“不构成投资或财务建议”；
- 不给出诊断、用药、投资买卖、赌博、违法或危险行为指引；
- 不使用“百分百灵验、改命、保证发财、治疗疾病”等高风险表述；
- 目标受众设为非儿童，建议产品定位为 18 岁以上；最终商店年龄等级以问卷结果为准；
- 所有卡牌、图标、字体、音乐、二维码、品牌素材须有权使用；MediaPipe 等开源许可和 Notices 一并保留。

## 3. 总体技术架构

```text
共享 Web 业务层
HTML/CSS/JS + 64卦资源 + 本地 MediaPipe
                 │
           Capacitor Bridge
        ┌────────┴────────┐
        │                 │
iOS 原生容器          Android 原生容器
WKWebView             Android WebView
StoreKit 2            Play Billing
AVCamera 权限         CAMERA 权限
Share Sheet           Android Sharesheet
Keychain 缓存         Keystore 缓存
        │                 │
        └────────┬────────┘
                 │ HTTPS
          轻量权益校验服务
 Apple Server API / Google Play Developer API
 Server Notifications / RTDN
```

建议目录：

```text
app/
  package.json
  capacitor.config.ts
  www/
    index.html
    js/
      app.js
      billing.js
      storage.js
      platform.js
    assets/
      cards/
      images/
    vendor/mediapipe/
    legal/
  ios/
  android/
server/
  entitlement-api/
docs/
```

核心原则：

1. Web 层只处理界面和问卦业务，不直接判断购买是否有效。
2. 原生桥统一暴露 `purchase`、`restore`、`getEntitlement`、`share`、`haptic`、`openSettings`。
3. `platform.js` 运行时识别 iOS/Android，支付页只加载当前平台的商品。
4. 不允许 WebView 任意跳转；外部 HTTPS 链接交给系统浏览器打开。
5. 禁止 `file://` 任意访问、混合内容、明文 HTTP 和不必要的 JS Bridge。
6. 摄像头帧只在内存中交给本地 MediaPipe，不保存、不上传、不写日志。

## 4. 共享 Web 层改造

### 4.1 资源与性能

- 将 `index_0625_1906.html` 更名并迁入 `app/www/index.html`；
- 使用可读的 `zhongkui.js` 作为维护源，构建时再压缩，不继续以混淆文件作为唯一源码；
- 删除 CDN `<script>`，使用 `vendor/mediapipe` 本地文件；未使用的 `control_utils` 不打包；
- 64 张卡图生成构建期清单，缺图直接让 CI 失败；
- 将默认卡面改为 `工厂2.0/背面.webp`；
- 预加载首页和当前卦所需资源，其余卡片按需加载；
- 压缩背景图和商店截图，但保留视觉质量；
- 低内存或低帧率设备自动降级到点击模式；
- Release 禁止远程调试、console 中的用户问题文本和摄像头信息。

### 4.2 数据与账号

首发推荐删除“登录/注册/退出”和 `zhongkuiUsersDB`：

- 历史记录只保存到本机加密存储；
- 设置页提供“删除全部卦志”和“清除本机数据”；
- 购买通过同一 Apple ID / Google Play 账号恢复；
- iOS 购买与 Android 购买不自动跨平台互通；界面需明确说明；
- 不把用户提出的问题、卦象或摄像头内容发送到服务端。

如果二期确需跨设备同步，才增加云账号。届时必须补充：邮箱验证/第三方登录、服务端安全存储、应用内注销、网页删除入口、保留期限以及 Apple 的登录规则。若使用 Google/微信等第三方登录作为主要登录方式，iOS 通常还需要满足 Sign in with Apple 要求。

### 4.3 App 级体验补齐

- 首次启动：娱乐免责声明、隐私政策/用户协议入口；
- 摄像头模式：先展示用途说明，用户主动点击后才请求系统权限；
- 权限拒绝：继续使用点击模式，并提供“前往系统设置”；
- 原生触感：摇卦、落币、成卦三个节点使用轻量 haptic；
- 原生分享：分享文本和公开商店链接，不分享本地文件路径或用户私密问题；
- 生命周期：切后台立即停止摄像头，恢复前不自动重新打开；
- 设置页：隐私政策、用户协议、免责声明、恢复购买、删除本地数据、开源许可、版本号、客服邮箱；
- 离线：首页、点击问卦、历史记录完整可用；只有购买/恢复购买需要联网。

## 5. iOS / Apple App Store 方案

### 5.1 产品与审核前置门槛

Apple 的两项要求必须分别处理：4.2 要求应用超出网站重新包装；4.3(b) 要求占卜这类饱和类别提供有实质差异或明显改进的体验。解决 4.2 不等于解决 4.3(b)。

建议在原型阶段确定并完成可实际演示的差异化组合，例如：

- 有原创、可追溯来源的六十四卦文化释读，而非仅将通用随机结果配上卡面；
- 将本地卦志做成结构化自我反思记录，支持用户补记、回顾和对照，不宣称预测准确度；
- 完成稳定的离线手势交互，形成贯穿演卦流程的独特体验，并提供无相机操作和无障碍路径；
- 在审核说明中逐项展示现有同类产品与本应用的实际差异，截图和演示必须对应已实现功能。

以上是可供验证的方向，不是 Apple 保证认可的功能清单。如果最终产品仍主要是通用占卜结果页加内购，建议暂缓 iOS 提交，继续完善产品或调整首发平台。商店名称和“仅供娱乐”声明必须如实描述内容，不能用于掩盖核心功能。

### 5.2 工程规格

| 项目 | 建议 |
|---|---|
| 容器 | Capacitor 8 + WKWebView |
| 最低系统 | iOS 15，与 Capacitor 8 的最低部署版本相符；根据真机覆盖率可上调 |
| 构建环境 | Node.js 22+、Xcode 26+；Apple 自 2026-04-28 起要求使用 iOS 26 SDK 或更高提交；构建 SDK 不等于最低支持系统，提审前再次核对 |
| 设备 | 建议 iPhone + iPad 通用；若只支持 iPhone，应明确产品范围并验证 iPad 兼容运行 |
| 方向 | 首发锁定竖屏，iPad 分屏场景仍需布局正常 |
| Bundle ID | 建议沿用唯一稳定 ID，如 `com.gongdao.zhongkui` |
| 权限 | 仅 Camera；不申请照片、麦克风、位置、通讯录和跟踪权限 |
| 分发 | TestFlight → 分阶段发布 |

实施步骤：

1. 在 Mac 上安装 Node.js 22+、CocoaPods（如依赖需要）和 Xcode 26+；
2. 安装 `@capacitor/ios`，执行 `npx cap add ios`；
3. 设置 Team、Bundle ID、版本号、签名证书和 Provisioning；
4. `Info.plist` 添加真实明确的 `NSCameraUsageDescription`；
5. 不配置 `NSAllowsArbitraryLoads`，所有联网只走 HTTPS；
6. 添加 `PrivacyInfo.xcprivacy`，并审计 Capacitor、支付插件等 SDK 的 Required Reason API；
7. 如果仅使用标准 HTTPS/StoreKit 且无自研非豁免加密，可在核实后设置相应出口合规声明；
8. 用真机验证相机、WASM 内存、前后台切换和支付。

建议权限文案：

> “用于在您主动选择‘手势演卦’时识别手部动作。画面仅在本机实时处理，不保存、不上传；拒绝后仍可使用点击模式。”

### 5.3 Apple 支付

数字功能“无限演卦/永久解锁”按首发统一商店支付策略使用 Apple IAP，不采用地区性外部购买安排。建议配置：

| 项 | 配置 |
|---|---|
| 类型 | Non-Consumable 一次性非消耗型 |
| Product ID | `premium_unlock`，创建前确认最终命名，创建后不要随意更换 |
| 展示名 | 完整版永久解锁 |
| 购买恢复 | 设置页与付费页均提供“恢复购买” |
| 家庭共享 | 由产品决定；开启前确认权益和价格策略 |
| 退款/撤销 | 通过 App Store Server Notifications V2 同步撤销权益 |

客户端使用 StoreKit 2：

- 通过 Swift 原生桥或经核实使用 StoreKit 2 的维护中插件接入；不能把现有 Android 插件和 `GOOGLE_PLAY` 配置直接用于 iOS；
- 从商店加载本地化标题和价格，禁止把价格写死在 HTML；
- 购买成功后验证 `Transaction` 签名，再上送交易标识到服务端；
- 监听交易更新；
- 只有验证成功的交易才解锁；
- 完成交易前确保权益已经安全记录；
- 恢复时以 `currentEntitlements` 和服务端状态为准；
- 无网络时可使用最近一次签名权益缓存，但需设计合理离线宽限并在联网后复核。

按本方案首发策略，应用内移除企业微信二维码、激活码、网页价格比较或“去官网更便宜”等引导。Apple 美国区等存在外部购买链接规则，不能概括为全球一律禁止；若后续采用，须按真实 storefront 和当期条款另做设计，不以系统语言、IP 或 GPS 简单替代商店地区判断。

### 5.4 Apple 隐私与审核

- 如果首发按本方案不上传问卦内容、不接广告/分析，摄像头画面与本地卦志不属于服务端收集；
- 若权益服务接收交易 ID、商品 ID、平台和匿名安装/账号标识，App Privacy 应据实申报 Purchase History 与 Identifiers；
- 不使用广告标识符，不弹 ATT；未来接入跟踪 SDK 后重新评估；
- 隐私政策、App Privacy answers、实际网络流量必须一致；
- 若存在账号创建，必须在应用内提供账号删除；本方案首发无账号，可避免此项；
- App Review Notes 写清手势入口、相机仅本地处理、点击降级、IAP 商品、恢复购买步骤；
- 提供审核期间可用的后台服务，不应要求审核员联系微信获得激活码；
- 用已实现的离线能力、文化内容、反思记录和独特交互说明实际产品价值；单纯添加分享、触感和 IAP 不保证符合 4.2 或 4.3(b)。

### 5.5 中国大陆 App Store 特别项

如计划在中国大陆区上架，还需要单独评估：

- App 备案/ICP 相关要求和 App Store Connect 中的备案信息；
- 运营主体、域名、隐私政策和客服资质；
- 占卜、宗教文化、健康/财运表述及内容服务的当地合规风险；
- 是否应首发暂不选择中国大陆区，完成当地法律与资质评估后再开放。

技术完成不等于中国大陆区一定具备发行资格。该区域建议由熟悉中国互联网和内容监管的法律顾问出具结论。

## 6. Android / Google Play 方案

### 6.1 工程规格

| 项目 | 建议 |
|---|---|
| 容器 | 复用现有 Capacitor Android 工程 |
| minSdk | 建议 26，减少旧 WebView/WASM/摄像头兼容成本 |
| targetSdk | 2026-10-10 提审建议 API 36；每次发布前按 Play Console 当前要求复核 |
| 格式 | AAB |
| 架构 | 由 AAB 管理；当前 MediaPipe 为 Web/WASM，不依赖自带原生 ABI |
| 权限 | `INTERNET`、`CAMERA`，不申请其他敏感权限 |
| 签名 | Play App Signing + 独立 upload key |
| 分发 | Internal → Closed → Production staged rollout |

对现有工程的具体整改：

- 将 `android:allowBackup` 改为 false，或用 `dataExtractionRules` 排除卦志、安装标识和权益缓存；
- `MainActivity` 保持最小桥接面，确认 Capacitor 能正确转发 WebView 摄像头授权；
- 首次进入手势模式再请求 CAMERA，不在启动时请求；
- WebView 禁止 mixed content、文件跨域访问、任意弹窗和未知协议；
- Release 关闭 WebView debugging；
- 外链只允许隐私政策、用户协议、客服和商店域名白名单；
- 将 `keystore.properties` 与 keystore 移出工程和版本库；
- 当前 `cordova-plugin-purchase 13.18.0` 与 Billing 9.0.0 必须在真实 Play 测试轨道验证，不能只以本地构建成功作为支付验收；
- 新版本发布前检查 Play SDK Index、Billing Library 和 target API 的最新截止日期。

### 6.2 Google Play 支付

面向多地区首发、且未采用符合资格的地区支付例外时，应用内数字功能按默认规则使用 Play Billing。建议继续使用一次性商品：

| 项 | 配置 |
|---|---|
| 商品类型 | One-time product / non-consumable entitlement |
| Product ID | `premium_unlock` |
| 确认 | 购买验证后及时 acknowledge；不要 consume |
| 待处理交易 | 只有状态为 PURCHASED 后才发放；PENDING 时展示处理中 |
| 恢复 | 启动及用户点击恢复时查询现有购买 |
| 退款/撤销 | Google Play Developer API + Real-time Developer Notifications |

当前 Android 原型存在两个正式版风险：

1. `approved` 后直接 `finish()` 并写 localStorage，没有服务端校验；
2. 购买状态只靠本地布尔值，清数据、篡改或退款后都可能不一致。

正式版流程应改为：

```text
Play 返回 purchaseToken
→ 客户端把 packageName/productId/token 通过 HTTPS 发给服务端
→ 服务端调用 Google Play Developer API 核验包名、商品、购买状态、退款/撤销及重复请求
→ 服务端记录权益
→ 优先由服务端 acknowledge，并与客户端 finish 幂等协调，避免依赖客户端持续在线
→ 下发签名权益并解锁
```

不采用适用地区的替代结算、用户选择结算或外部购买安排时，不加入微信、支付宝、Stripe 或外部网页付款。具体例外的资格、费用、交易报告、用户披露等要求须逐地区复核，首发不启用。

### 6.3 Google Play 隐私与审核

- Data Safety 中按最终网络流量逐项申报；本机摄像头帧和本地卦志如从未离开设备，通常不作为开发者收集，但政策解释应在提审时复核；
- 权益服务若接收 purchase token、交易记录和匿名标识，应申报购买信息与设备/其他标识，注明加密传输、用途、保留和删除方式；
- 隐私政策必须是公开 HTTPS 页面，不能只放在安装包内，页面不得需要登录；
- 如果以后提供账号创建，Google 通常要求应用内和应用外网页均可发起账号/数据删除；
- 目标受众不选儿童，广告项选择“无广告”（前提是确实不接任何广告 SDK）；
- IARC、Data Safety、App access、Financial features、Health 等表单按实际回答，占卜不应伪装成医疗或金融服务；
- 新个人开发者账号可能需要满足 Play Console 显示的封闭测试条件。常见门槛为至少 12 名测试者连续加入 14 天，但以账号当前页面为准。

Google Play 面向中国大陆普通消费者的可达性有限。Android 方案主要面向 Play 支持国家/地区；若另上国内安卓商店，需要重新评估软件著作权、备案、隐私合规、支付规则、SDK 合规和各商店资质，不应直接套用本方案。

## 7. 权益校验服务

### 7.1 是否必须

商店允许纯客户端实现非消耗型购买，但正式商业版本建议配置服务端。它解决：

- localStorage/设备本地状态可被篡改；
- 退款、撤销、拒付后收回权益；
- 换机和清数据后的稳定恢复；
- 支付失败、重复回调和并发请求的幂等；
- Apple/Google 服务端通知；
- 客服查询交易状态而不接触支付卡信息。

### 7.2 最小数据模型

```text
entitlements
  id
  platform                apple | google
  product_id
  store_transaction_id    唯一、加密或受控保存
  apple_original_transaction_id
  google_purchase_token_encrypted  用于后续向 Google API 查询
  google_purchase_token_hash       用于索引/去重，不替代原始 token
  anonymous_subject_id    可选；不使用广告 ID
  status                  active | revoked | refunded | pending
  purchased_at
  updated_at
```

服务端不得保存 Apple/Google 账号密码、银行卡信息、摄像头内容或问卦内容。日志中对 token/JWS 脱敏，不把完整票据写进错误日志。所有验证接口需有速率限制、重放防护、幂等键和 TLS。

Google purchase token 的原值必须受控加密保存，才能在退款、通知或恢复时再次调用相关查询接口；仅保存不可逆哈希无法完成这些调用。数据库解密权限和加密密钥需分离管理。

无自有账号时，服务端核验的是有效商店交易，而不是某个自然人的身份；不能声称通过 token 直接读取或证明 Apple ID / Google 账号归属。恢复购买由客户端从商店取得当前有效购买，再交服务端复核；不得把权益永久硬绑定旧安装 ID，导致合法换机无法恢复。

### 7.3 跨平台权益

首发建议不跨平台共享：Apple 购买只恢复到 Apple 生态，Google 购买只恢复到 Google 生态，并在购买前明确。

若未来要求“一次购买双平台通用”，需要自有账号将两家交易映射到同一用户；应用内新购默认仍走对应平台内购，地区例外另外评估。这会新增账号删除、数据导出、登录合规、客服和欺诈风险，不建议首发实现。

## 8. 隐私合规落地清单

### 8.1 数据地图

| 数据 | 处理位置 | 是否上传 | 目的 | 建议保存期限/删除 |
|---|---|---:|---|---|
| 摄像头实时画面 | 设备内存 | 否 | 手势识别 | 实时处理后立即丢弃 |
| 用户所选/输入问题 | 设备本地 | 否 | 展示与卦志 | 用户删除或卸载；默认不云备份 |
| 卦象历史 | 设备本地加密存储 | 否 | 历史记录 | 用户可逐条/全部删除 |
| 购买商品与交易标识 | 商店、权益服务 | 是 | 验证、恢复、退款处理 | 按财税/争议和隐私政策期限保存 |
| 匿名安装/权益标识 | Keychain/Keystore、权益服务 | 可选 | 防重复与权益映射 | 删除请求或不再必要时删除 |
| 崩溃数据 | 首发建议不接第三方 SDK | 否 | — | — |

### 8.2 隐私政策必须包含

- 数据控制者/开发者的法定名称；
- 可用的隐私与客服邮箱，不能只写“到商店留言”；
- 数据类型、目的、处理方式和法律依据（按适用地区）；
- 摄像头仅本地处理、不保存、不上传；
- 本地卦志的保存与删除方法；
- Apple/Google 作为支付提供方的角色和链接；
- 权益服务处理的交易标识、保存期限和安全措施；
- 是否共享/出售、是否有广告/跟踪；
- 儿童政策；
- 跨境处理（如有）；
- 用户访问、更正、删除、撤回同意和投诉渠道；
- 生效日期、更新通知机制。

### 8.3 权限与同意

- 不用“一揽子同意”替代系统权限；
- 用户点击手势模式后先解释用途，再触发系统摄像头弹窗；
- 拒绝后不反复骚扰，点击模式保持全部核心流程可用；
- 隐私政策与用户协议常驻设置页；
- 无广告追踪就不申请 ATT、不读取 IDFA/Android Advertising ID；
- 每增加一个 SDK，都必须做权限、网络域名、数据收集、Apple Privacy Manifest 和 Play Data Safety 复审。

## 9. 安全方案

- 删除明文账号密码和旧 localStorage 用户库迁移逻辑；如已有测试数据，只做本地一次性清理；
- iOS 权益凭证使用 Keychain，Android 使用 Keystore 支撑的加密存储；
- 卦志可用 SQLite/原生加密存储，至少使用系统文件保护并禁止云备份；
- WebView 只加载打包资源和白名单 HTTPS；
- 不允许任意 `window.open`、自签名证书、HTTP 明文流量或忽略 TLS 错误；
- JS Bridge 方法采用最小白名单，参数严格校验；
- Release 移除调试菜单、测试商品、日志票据和 WebView 调试；
- 服务端密钥、Apple `.p8`、Google service account、keystore 密码绝不进入客户端或版本库；
- 建立依赖锁定、许可证清单和漏洞扫描；
- 对购买接口做幂等、签名验证、重放保护、速率限制和审计日志。

## 10. 商店资料与审核包

### 10.1 两个平台共用

- 应用名、副标题/简短描述、完整描述；
- “仅供娱乐”的清晰说明；
- 隐私政策 URL、用户协议 URL、支持 URL、客服邮箱；
- 图标、启动图、手机截图、平板截图；
- 开源许可和素材授权台账；
- 手势模式演示和审核说明；
- 不夸大预测效果，不使用赌博、赢钱、治疗等词；
- 商店截图必须是应用真实界面，付费功能和试玩限制要与实际一致。

### 10.2 App Store Connect

- 1024×1024 图标；
- iPhone/iPad 对应尺寸截图；
- 类别建议 Entertainment；
- App Privacy、Age Rating、出口合规；
- IAP 商品元数据、审核截图和价格；
- App Review Notes 说明相机用途、点击模式、内购与恢复路径；
- 无账号则注明无需登录；有审核后台时提供可用演示账号。

### 10.3 Google Play Console

- 512×512 图标、1024×500 feature graphic、手机/平板截图；
- App content、Data Safety、IARC、Target audience、Ads、App access；
- 创建并激活 `premium_unlock`；
- 上传 AAB、开启 Play App Signing；
- 配置 License Testers 和测试轨道；
- 正式发布采用 5% → 20% → 50% → 100% 分阶段放量。

## 11. 测试矩阵与验收标准

### 11.1 功能矩阵

| 场景 | iOS | Android | 验收 |
|---|---:|---:|---|
| 冷启动/热启动 | 必测 | 必测 | 无白屏、资源 100% 本地可加载 |
| 飞行模式点击演卦 | 必测 | 必测 | 可完整到结果页 |
| 摄像头允许/拒绝/永久拒绝 | 必测 | 必测 | 无崩溃，可降级并打开设置 |
| 切后台/锁屏/来电 | 必测 | 必测 | 摄像头立即停止，恢复不误启 |
| 低内存/低帧率 | 必测 | 必测 | 自动或手动降级点击模式 |
| 刘海、灵动岛、手势区 | 必测 | — | 控件不遮挡 |
| 多尺寸/分屏/返回键 | iPad 必测 | 必测 | 布局和导航正确 |
| 首购、取消、失败 | Sandbox | License tester | 状态和提示正确 |
| Pending/中断/重复回调 | Sandbox | 必测 | 不提前发权益，接口幂等 |
| 恢复购买/换机/清数据 | 必测 | 必测 | 有效交易可恢复 |
| 退款/撤销 | 必测 | 必测 | 通知后收回权益 |
| 删除本地数据 | 必测 | 必测 | 卦志和问题不可恢复 |
| 网络代理检查 | 必测 | 必测 | 仅声明域名，无图像/问题上传 |

### 11.2 发布门槛

- P0/P1 缺陷为零；
- 64 张卡牌和所有法律页面资源校验通过；
- 购买、恢复、退款、撤销在商店测试环境形成闭环；
- 拒绝摄像头后仍能使用完整免费/已购流程；
- 权益不能仅通过修改 localStorage 获得；
- 网络抓包确认摄像头帧和问卦内容从未上传；
- App Privacy/Data Safety 与抓包、SDK 清单一致；
- Android Vitals 和 TestFlight 崩溃日志无阻断问题；
- 真机覆盖至少 iOS 15/当前 iOS、Android 8/主流版本/Android 16，以及一台低内存安卓设备。

## 12. 实施阶段与工期

在素材、开发者账号、Mac 构建机和后端凭证及时就绪的前提下，建议按以下节奏：

| 阶段 | 工作 | 参考工期 | 出口标准 |
|---|---|---:|---|
| M0 决策 | iOS 差异化可行性、主体、地区、定价、Bundle ID、商品 ID | 2–3 天 | 明确 iOS 继续/暂缓结论，冻结不可逆标识；需新增内容时另计工期 |
| M1 Web 重构 | 资源本地化、删账号/微信激活、设置页、免责声明 | 4–6 天 | 浏览器与移动 WebView 主流程通过 |
| M2 双端壳 | iOS 工程、Android 整改、权限/分享/触感/生命周期 | 5–8 天 | 双端真机完整演卦 |
| M3 支付后端 | StoreKit 2、Play Billing、校验、通知、恢复 | 5–8 天 | 首购/恢复/退款闭环 |
| M4 合规素材 | 政策、协议、商店表单、截图和审核说明 | 3–5 天 | 两套提交资料齐全 |
| M5 测试发布 | TestFlight、Play 测试轨道、兼容/隐私测试 | 1–3 周 | 满足发布门槛 |

在产品差异化已明确、素材就绪且部分工作可并行的前提下，整体技术与合规准备约 4–6 周，不含新增原创内容的制作周期。若 Google 新个人开发者账号触发连续封闭测试要求，或中国大陆区需要资质/备案，日历时间会增加；商店审核耗时与获准结果均不作承诺。

## 13. 平台差异总表

| 维度 | iOS / App Store | Android / Google Play |
|---|---|---|
| Web 容器 | WKWebView | Android WebView |
| 支付 | StoreKit 2 / Apple IAP | Google Play Billing |
| 一次性商品 | Non-Consumable | One-time non-consumable entitlement |
| 恢复依据 | Apple ID 当前权益 | Play 账号现有购买 |
| 服务端通知 | App Store Server Notifications V2 | RTDN |
| 安全缓存 | Keychain | Keystore-backed encrypted storage |
| 隐私申报 | App Privacy + Privacy Manifest | Data Safety + SDK/权限审查 |
| 相机说明 | `NSCameraUsageDescription` | Manifest + runtime permission |
| 构建发布 | Xcode/Archive/TestFlight | Gradle/AAB/Play tracks |
| 重点审核风险 | 4.2 最低功能 + 4.3(b) 占卜类别饱和 | 低质量/重复内容、内容政策与 WebView 安全 |
| 中国大陆 | 需单独评估 App 备案和内容资质 | Play 主发行不覆盖普通大陆渠道 |

## 14. 上线前最终核对

### 共用

- [ ] 删除 CDN、企业微信激活、外部数字支付和明文账号密码
- [ ] 64 卦资源、默认卡面、背景、图标全部本地可用
- [ ] 娱乐/医疗/财务免责声明到位
- [ ] 隐私政策、用户协议、支持页为公开 HTTPS 页面
- [ ] 摄像头只在主动触发后请求，帧不保存不上传
- [ ] 本地数据可删除，敏感数据不进入云备份
- [ ] 支付权益以验证后的商店交易为准
- [ ] 第三方 SDK、许可证、网络域名和数据地图一致

### iOS

- [ ] 已完成 4.2 / 4.3(b) 产品差异化评估，并有可演示的实际改进
- [ ] Xcode/iOS SDK 满足提审当日要求
- [ ] StoreKit 2 首购、恢复、退款、撤销通过
- [ ] Privacy Manifest 与 App Privacy 完成
- [ ] Review Notes、IAP 审核截图、年龄等级完成
- [ ] 中国大陆区如勾选，资质和内容结论已确认

### Android

- [ ] target API、Billing Library、SDK Index 满足提审当日要求
- [ ] AAB、Play App Signing、上传密钥安全完成
- [ ] Pending、acknowledge、恢复、退款、RTDN 通过
- [ ] Data Safety、IARC、App access、Target audience 完成
- [ ] 若账号触发封闭测试要求，已按 Console 完成

## 15. 官方政策复核入口

**本次核验边界：** 已在线核验 Apple 审核规则中的 4.2、4.3(b) 与地区性购买链接条款，以及 Apple 构建要求；同时核验 Capacitor 8 的 Node.js/Xcode/iOS 部署要求。Google Support 政策正文请求遇到验证码，未完成其全部现行条款的在线核验。本文中的 Google target API、Billing 版本期限、测试门槛和地区支付安排是发布前待复核项，必须以该开发者账号当期 Play Console 与官方规则为准，不能将本文作为已通过政策核验的证明。

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple Upcoming Requirements: https://developer.apple.com/news/upcoming-requirements/
- Apple Account Deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Google Play Payments Policy: https://support.google.com/googleplay/android-developer/answer/9858738
- Google Play Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play Target API Requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Google Play Account Deletion Requirements: https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play Billing: https://developer.android.com/google/play/billing
- Capacitor 8 Migration: https://capacitorjs.com/docs/updating/8-0

---

**最终建议：** 先评估 iOS 4.3(b) 下的实质差异化，再以“无账号 + 一次性永久解锁 + 完全本地问卦/手势处理”作为 V1.0。该路线贴合当前产品，支付和隐私复杂度较低，但不构成审核通过承诺。现有 Android 原型可复用工程结构和本地资源，但支付、本地权益、备份、签名和隐私文本必须按本文整改；iOS 则需在 Mac/Xcode 上新增完整工程与 StoreKit 2 链路。中国大陆发行另以资质和内容合规结论为前提。
