# 公道钟馗 Android 封装与 Google Play 首发方案

**方案版本：** V1.0  
**编制日期：** 2026-10-10  
**目标平台：** Android / Google Play  
**基线工程：** `app/`、`app/www/index.html`、`app/www/zhongkui.js`  
**建议路线：** 复用现有 Capacitor Android 工程 + 本地 Web 资源 + Google Play 一次性内购 + 最小权益校验服务

> 本方案只针对 Android / Google Play 首发，不包含 iOS。它是工程、支付、隐私和发布执行方案，不构成法律意见，也不承诺商店审核一定通过。政策、账号资格、测试门槛和地区规则会变化，创建应用及每次发布前都应以 Play Console 和官方文档的实时要求为准。

## 1. 首发结论

### 1.1 不需要从头封装

当前 `app/` 已经具备可复用的 Android 基础：

- Capacitor Android 8.5.2；
- 应用 ID `com.gongdao.zhongkui`；
- AAB 构建工程，compile/target SDK 36；
- MediaPipe JS/WASM 与卡牌资源已在 `app/www` 本地化；
- `cordova-plugin-purchase` 13.18.0 与 Billing 9.0.0 原生依赖已生成；
- 系统分享、相机权限和 Android 返回键已有原型。

工程在 2026-10-08 曾生成约 27.8 MB 的 `app-release.aab`。这只能证明本机曾经产出 AAB，不能证明支付、签名、隐私声明、Play 安装链路或商店资料已经达到正式发布标准。

### 1.2 V1 首发产品边界

- 免费体验一次；
- 一个 Google Play 一次性非消耗型商品，永久解锁购买说明中列明的完整功能；
- V1 不设自建账号，问题和卦志只存本机；
- 购买、恢复、退款和撤销状态以 Google Play 交易为准；
- 手势识别只在用户主动进入后请求相机，帧只在本机处理；
- 首发只面向开发者账号具备销售资格且 Google Play 可发行的国家/地区；中国大陆渠道及国内安卓商店另案评估。

### 1.3 当前不能直接提审的原因

现有购买逻辑在 `approved()` 中直接 `finish()` 并写入 `localStorage.zhongkuiPremiumUnlocked`，没有服务端交易验证和退款撤销闭环。页面还保留旧登录/注册流程，`zhongkuiUsersDB` 会把账号和密码写入本地存储；隐私政策仍写着“没有后端”，而推荐方案会有权益验证服务；Android Manifest 仍开启 `allowBackup=true`。因此当前 AAB 不能视为可直接上架版本。

## 2. 当前工程基线与目标状态

| 项目 | 当前事实 | 目标状态 |
|---|---|---|
| Capacitor | `@capacitor/android` 8.5.2 | 锁定依赖，`npm ci` 后可重复同步 |
| 包名 | `com.gongdao.zhongkui` | 创建 Play 应用前冻结；发布后不随意更换 |
| SDK | min 24、compile 36、target 36 | 首发保持 min 24；target 36 按提审日 Console 要求复核 |
| Billing | `cordova-plugin-purchase` 13.18.0；原生依赖显示 Billing 9.0.0 | 在真实 Play 轨道验证；根据官方兼容矩阵决定是否升级 |
| Web 资源 | MediaPipe 和卡牌在 `app/www` | 发布包完全离线可加载，不依赖 CDN |
| 权益来源 | 可编辑的 localStorage 布尔值 | Play 交易 + 服务端验证是事实来源，本地只做缓存 |
| 账号 | 页面和 JS 仍有登录/注册/会话逻辑 | V1 删除账号体系，保留游客本机历史 |
| 隐私政策 | 生效日期旧，主体和联系方式不足，声称无后端 | 改成与最终网络流量、运营主体、交易验证一致的公开 HTTPS 页面 |
| 备份 | `allowBackup=true` | 关闭备份，或使用数据提取规则排除敏感数据 |
| 签名 | 工程中存在 `keystore.properties` 和 keystore 文件 | 秘密移出工程；使用 Play App Signing 和独立 upload key |
| 版本 | 当前 `versionCode=1` | 以 Play Console 已接受的最高版本号为准递增 |

## 3. 产品与 Web 层整改

### 3.1 保留并补齐

- 点击模式在飞行模式下可完整完成一次演卦；
- 手势模式由用户主动进入，先展示用途说明，再请求 CAMERA；拒绝后点击模式仍可用；
- 应用切后台、锁屏或来电时停止相机；回前台不自动重启相机；
- 付费页显示 Play 返回的本地化商品名和价格，不硬编码货币价格；
- 系统分享只分享用户明确选择的非敏感内容；
- 设置页提供隐私政策、使用条款/免责声明、客服、恢复购买、删除本机卦志、开源许可和版本号。

### 3.2 删除或改造

- 删除 `loginPage`、注册/退出按钮、密码输入框、`zhongkuiUsersDB` 写入和旧会话迁移逻辑；
- 删除“登录后永久保存”的暗示，明确说明卦志仅保存在本机，卸载或清除数据可能丢失；
- 删除企业微信二维码、激活码、网页收款、微信/支付宝/Stripe 和任何绕开 Play Billing 的购买引导；
- 删除以 `zhongkuiPremiumUnlocked=true` 单独授权的逻辑；清除本地数据后应能通过 Play 查询恢复；
- 健康类问题标注“不构成医疗建议”，财运类问题标注“不构成投资或财务建议”；不得承诺预测准确、治疗、发财或赌博获利；
- 所有卡牌、字体、音乐、Logo、MediaPipe 许可和商店素材建立可追溯授权台账。

## 4. Android 工程封装

### 4.1 构建与安全配置

- 保持 `targetSdkVersion=36`。Android Developers 当前页面显示，自 2026-08-31 起新应用和更新需要 target Android 16 / API 36 或更高；提审前再次核对是否有延期或新门槛；
- 首发可保持 min SDK 24，除非真机测试证明 MediaPipe、WebView 或某个依赖需要上调；
- 使用 AAB，启用 Google Play App Signing；本地仅使用受控的 upload key；
- 最终 Manifest 只保留真正需要的 `INTERNET` 和 `CAMERA`，清点插件合并后的权限；
- 关闭 WebView debugging、mixed content、任意未知协议和不必要的外链；隐私政策、条款、客服链接使用 HTTPS 白名单；
- release 包移除测试后端、测试商品、调试入口和敏感日志；
- 对 64 张卡牌、背景、WASM/TFLite、法律页面做构建期资源清单校验，缺失即让构建失败；
- `allowBackup` 改为 `false`，或用 Android 数据提取规则明确排除问题、卦志、设备标识和权益缓存；真机验收卸载、云迁移和恢复场景；
- 检查返回键、状态栏/导航栏、安全区、系统字体放大、横竖屏和 TalkBack 主流程。

### 4.2 签名与版本

1. 在 Play Console 创建应用前确认包名、应用主体和开发者账号。
2. 开启 Play App Signing，上传 AAB 时只使用 upload key。
3. 将 `keystore.properties`、keystore 密码、服务账号 JSON 和后端密钥移出工程、版本库、聊天和公开网盘。
4. 如果密钥曾经进入版本库或被他人取得，先确认它是 upload key 还是应用签名密钥，再按 Play Console 支持的密钥重置/升级流程处理。
5. 版本号以 Console 已接受的最高 `versionCode` 为准递增；不能上传低版本号覆盖已发布版本。

## 5. Google Play Billing 方案

### 5.1 商品定义

| 字段 | 建议 |
|---|---|
| 商品类型 | One-time product，一次性非消耗型权益 |
| Product ID | `premium_unlock`；创建前冻结，后续不随意更换 |
| 权益 | 永久解除试玩闸门，开放购买说明中明确的无限演卦及本机功能 |
| 价格 | 由 Play Console 配置基准价和地区价格，客户端只显示 Play 返回值 |
| 消费方式 | 不 consume；验证后 acknowledge |
| 测试方式 | Play license tester + 内部/闭合测试轨道安装；侧载 APK 不等同真实购买测试 |

购买文案应直接说明“一次性购买”和具体解锁内容，不使用模糊的“结缘”替代价格、商品类型或退款说明。

### 5.2 首购状态机

```text
启动或用户点购买
  -> BillingClient 连接并查询 premium_unlock 商品详情
  -> Google Play 展示购买确认
  -> PENDING：只显示处理中，不解锁、不 acknowledge
  -> PURCHASED：提交 packageName、productId、purchaseToken 到 HTTPS 后端
  -> 后端调用 Google Play Developer API 核验包名、商品、状态和 token
  -> 服务端幂等记录有效权益
  -> 服务端 acknowledge 一次性购买
  -> 返回最小权益结果，客户端更新缓存和页面
```

后端验证成功前不得发放权益。Google 官方 Billing 安全文档建议把验证、资格检查和 acknowledge 放到安全后端；未及时确认的购买可能被自动退款。服务端必须幂等，重复回调不能重复发放或破坏已有效状态。

### 5.3 恢复、退款和离线

- 启动时查询当前非消耗型购买；设置页和付费页提供“恢复购买”；
- 清除应用数据或换机后，从 Play 账号重新查询，再交后端复核，不依赖旧 localStorage 或旧安装 ID；
- 无网络时可使用最近一次有效权益的短期缓存，但恢复联网后必须复核；缓存不是永久授权事实；
- 配置 Real-time Developer Notifications（RTDN），处理退款、撤销和购买状态变化；通知处理必须支持乱序、重复和延迟；
- Purchase token 如果要支持后续 API 查询，应加密保存并限制访问；日志只保存脱敏标识、状态和时间，不写完整 token；
- 一次性非消耗品不 consume。只有在验证和记录权益完成后 acknowledge。

### 5.4 最小后端

V1 不需要完整账号系统，也不需要上传问题或卦象。只需要：

- 一个 HTTPS 验证接口，接收固定包名、商品 ID 和 purchaseToken；
- 受限权限的 Google Play Developer API 服务账号；密钥只部署在服务端；
- 交易表：加密 token 或受控 token、去重哈希、商品、状态、购买时间、更新时间和审计字段；
- 校验 packageName、productId、purchaseState、退款/撤销状态和重复 token；
- TLS、速率限制、重放防护、幂等键、密钥轮换和脱敏日志；
- RTDN Pub/Sub topic 与通知处理器；
- 设备无关的恢复设计：购买属于 Play 账号可查询状态，不永久绑定某台设备。

如果暂时不建设后端，必须把它作为明确的风险版本：客户端查询可以减少开发量，但无法可靠处理防篡改、退款撤销和后台权益治理。正式收费版本推荐使用上述最小后端。

工程当前生成 Billing 9.0.0；Google 官方 release notes 已显示 9.1.0。先在 Play 内部轨道验证 `cordova-plugin-purchase` 13.18.0 与 Billing 9.x 的兼容性，再按官方兼容矩阵决定升级，不要只为追版本而跳过真实购买和恢复测试。

## 6. 隐私、Data Safety 与内容合规

### 6.1 首发数据地图

| 数据 | 处理位置 | 是否离开设备 | 目的 |
|---|---|---:|---|
| 摄像头实时帧 | WebView 内存、本地 MediaPipe | 否 | 手势识别 |
| 用户问题、卦象和卦志 | 本机存储 | 否 | 演卦与历史记录 |
| 支付卡等支付信息 | Google Play | 由 Google 处理 | 完成购买 |
| purchaseToken、商品 ID、交易状态 | 权益后端 | 是，经 HTTPS | 验证、恢复、退款 |
| 广告 ID、分析事件、崩溃数据 | 首发不接入 | 否 | 不适用 |

如果未来加入 Firebase、广告、统计、推送或其他 SDK，必须重新审计网络域名、权限、自动采集字段、Data Safety、隐私政策和删除机制。

### 6.2 Data Safety 填报原则

- 以最终 Release AAB 的依赖、网络抓包、后端实际字段和 Play SDK Index 为依据填写；不能直接沿用旧文档“完全没有数据收集”的表述；
- 若后端接收 purchaseToken、商品和交易状态，按 Play Console 当期分类如实申报购买相关信息；若传输安装标识，再评估设备或其他标识符分类；
- 只有在真实确认摄像头帧、问题和卦志从不离开设备时，才可声明仅本地处理；
- 如没有广告，按真实情况声明无广告；不提前加入 Advertising ID 或跟踪 SDK；
- 填写传输加密、用途、是否关联身份、保留/删除方式和是否共享，并使其与隐私政策一致；
- 交易记录为完成验证、退款和争议处理所需的保存期限，应与本机数据删除期限区分说明。

### 6.3 隐私政策必须更新

公开 HTTPS 页面至少包含：

- 运营主体法定名称、隐私联系人、客服邮箱或正式支持渠道；
- 相机触发方式、用途、拒绝后的替代路径、图像不保存不上传的边界；
- 问题和卦志只存本机、删除方法、卸载和 Android 备份行为；
- Google Play 处理支付信息的角色；自有后端收到的 purchaseToken/商品/状态、目的、加密、权限、保留和删除方式；
- SDK、广告/分析、共享、跨境处理、儿童政策、用户权利和生效日期。

现有 `app/www/privacy-policy.html` 生效日期为 2025-07-01，且声称“没有后端服务器”。它不能原样作为正式版政策；实际运营主体和联系方式应由发布方确认后再部署。

### 6.4 内容和权限

- 首次手势操作前解释相机用途，再触发系统权限弹窗；永久拒绝后提供系统设置入口；
- 不申请麦克风、位置、联系人、照片库、电话等非必要权限；
- 应用名、截图和描述不得宣称保证准确预测、治疗疾病、投资获利或赌博收益；
- 目标受众、年龄等级和 IARC 问卷按真实内容回答，不为过审机械选择“工具”或“全年龄”；
- 公开隐私政策、应用内设置页和 Play Data Safety 必须描述同一套实际数据流。

## 7. Play Console 上架流程

### 7.1 创建应用前冻结

1. 确认开发者账号类型、法定名称、国家/地区、公开联系信息、收款和税务资料。
2. 冻结包名 `com.gongdao.zhongkui`、应用名、默认语言、商品 ID `premium_unlock`、运营主体和首发国家/地区。
3. 如果包名或 versionCode 1 已在 Console 使用，以现有 Play 应用的最高状态为准，不新建冲突应用。
4. 准备公开 HTTPS 隐私政策、支持页面/客服邮箱、用户协议和免责声明。
5. 配置 Play App Signing、upload key、Google Play Developer API 服务账号和 RTDN；服务账号密钥不进入客户端。

### 7.2 Console 内容

- 商店描述：准确说明六爻文化娱乐、点击/手势模式、离线能力和一次性解锁；不夸大预测效果；
- 素材：512×512 图标、1024×500 Feature Graphic、真实手机截图，并按 Console 当前提示补充平板或其他素材；
- 隐私政策：填写公开 HTTPS URL，且与应用内设置页是同一版本；
- App content：完成 Data Safety、IARC、Target audience、Ads、App access 等出现的表单；
- App access：无账号版本写明审核无需登录，并提供手势入口、付费页和恢复购买步骤；
- 商品：创建并激活 `premium_unlock`，核对一次性商品、价格、销售地区和付款设置；
- 测试：加入 license tester，使用内部/闭合轨道安装，不用侧载包代替 Play 购买测试；
- 发行：首发采用 staged rollout，先小比例观察崩溃、ANR、购买成功率、验证延迟和退款状态。

Google Play Support 的部分页面可能要求登录或触发验证码。本方案中账号测试者数量、连续测试天数、目标 API 截止日期的例外和地区支付资格均以创建应用后 Console 实时显示为准，不把旧报告中的固定数字视作普遍规则。

## 8. 测试与发布排期

### 8.1 阶段 A：账号与参数（1–3 天）

- 核实账号是否存在个人开发者封闭测试要求；
- 如果 Console 要求测试轨道和测试者数量，立即招募并启动，和工程整改并行；
- 确认包名、最高 versionCode、商品、销售地区、运营主体和支持邮箱。

### 8.2 阶段 B：P0 工程整改（约 4–7 个工作日）

- 删除旧登录/注册、明文密码和外部激活路径；
- 重写购买状态机，加入服务端验证、restore、pending、acknowledge、重复回调和错误重试；
- 更新隐私政策、设置页、相机说明、免责声明和客服入口；
- 关闭备份或排除敏感数据；清点最终 Manifest 和依赖 SDK；
- 移出签名秘密，确认 Play App Signing；
- 对离线资源、卡牌和法律页面做构建校验。

### 8.3 阶段 C：构建与验收

```powershell
cd F:\GDZK\问道APP纯净版\app
npm ci
npx cap sync android
cd android
.\gradlew.bat bundleRelease
```

Release 后检查 AAB 包名、versionCode、target SDK、签名、权限、商品 ID、Web 资源、隐私链接、调试配置和代码扫描结果。命令输出不能打印签名密码、purchaseToken 或服务账号密钥。

### 8.4 阶段 D：Play 轨道验收

| 场景 | 验收标准 |
|---|---|
| 冷启动、弱网、飞行模式 | 无白屏；点击演卦和本地资源完整可用 |
| 相机允许/拒绝/永久拒绝 | 手势入口说明清楚；无相机时点击模式可用 |
| 前后台/锁屏/来电 | 相机立即停止，恢复不自动开启 |
| 商品加载 | 显示 Play 返回的本地化名称和价格；商品不可用时不显示虚构价格 |
| 取消/失败 | 不解锁，提示明确，页面可重试 |
| PENDING | 不发权益、不 acknowledge，最终状态变化可继续处理 |
| PURCHASED | 服务端验证包名、商品和 token；重复请求幂等 |
| acknowledge | 验证并记录后及时完成；非消耗品不 consume |
| 恢复/清数据/换机 | Play 账号可重新查询并恢复，不依赖旧 localStorage |
| 退款/撤销/RTDN | 后端更新权益；重复和乱序通知不破坏状态 |
| 数据删除/备份 | 卦志可清除；敏感数据不意外进入备份 |
| 抓包 | 只有已披露服务域名；无摄像头帧、问题原文上传 |
| 多尺寸/字体/TalkBack | 主流程无裁切、遮挡和不可操作控件 |

### 8.5 阶段 E：正式发布

- P0/P1 问题为零，测试轨道购买闭环通过；
- 上传递增 versionCode 的 AAB，完成所有 App content 和 Data Safety 表单；
- 先 staged rollout，监控 Android Vitals、崩溃、ANR、支付失败、验证延迟、退款和用户反馈；
- 每次升级 Billing、target API 或新增 SDK，都先回归权限、购买、隐私和数据安全。

在素材、账号、后端和测试者及时就绪的前提下，技术与合规准备通常需要 3–6 周；账号验证、测试者招募、资质和商店审核不作固定日期承诺。

## 9. 正式提交阻断清单

### 产品与代码

- [ ] 删除注册、登录、明文密码和旧会话逻辑
- [ ] 删除微信/二维码/激活码/外部付款路径
- [ ] 权益不由可编辑 localStorage 单独决定
- [ ] 64 张卡牌、MediaPipe、法律页面和图标资源完整
- [ ] 点击模式离线可用，拒绝相机后主流程可用
- [ ] 相机切后台关闭，Release 无调试和敏感日志

### Billing 与后端

- [ ] `premium_unlock` 已在 Console 激活且 ID 完全一致
- [ ] 服务端验证 packageName、productId、purchaseToken 和购买状态
- [ ] PENDING 不发权益；有效交易幂等记录后 acknowledge
- [ ] 恢复购买、RTDN、退款和撤销通过测试
- [ ] token 加密、访问受限，密钥不进入 AAB

### Play Console 与隐私

- [ ] 隐私政策、客服/支持页 HTTPS 公开并与实现一致
- [ ] Data Safety、IARC、Target audience、Ads、App access 完成
- [ ] 图标、Feature Graphic 和截图真实反映发布版
- [ ] 目标国家、价格、税务和开发者资料正确
- [ ] 测试轨道与当前账号资格符合 Console 实时要求
- [ ] Play App Signing、upload key、versionCode 已确认
- [ ] staged rollout 和上线后监控负责人已确定

## 10. 官方复核入口

截至 2026-10-10，本方案在线核对了 Android Developers 的 target API、Billing 安全、一次性商品生命周期和 Billing Library 发布说明。Google Play Support 部分页面在本次访问中触发验证码，因此 Data Safety 和特定账号测试门槛必须以 Play Console 当前账号界面为准。

- Target API requirements: https://developer.android.com/google/play/requirements/target-sdk
- Play Billing security: https://developer.android.com/google/play/billing/security
- One-time purchase lifecycle: https://developer.android.com/google/play/billing/lifecycle/one-time
- Billing Library release notes: https://developer.android.com/google/play/billing/release-notes
- Google Play Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play testing requirements: https://support.google.com/googleplay/android-developer/answer/14151465
- Play Billing overview: https://developer.android.com/google/play/billing

**最终建议：** 按“删除旧登录与密码 → 完成 Play 一次性商品和后端验证 → 更新隐私与 Data Safety → 真实 Play 轨道付费测试 → 小比例正式发布”的顺序推进。现有 Android 工程可以复用，但当前 AAB 和支付原型还不能直接作为正式上架包。
