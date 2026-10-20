# 公道钟馗 APP · AAB 构建与 Google Play 上架指引

> 适用环境：Windows。工程已完成 Capacitor 封装和主要安全改造；只有 Cloud Run、政策正文、Play Console 配置、发布预检及内部支付验收全部完成后，产物才可送审。

---

## 一、环境准备（一次性）

| 依赖 | 版本要求 | 安装方式 |
|---|---|---|
| Node.js | ≥ 22.13 | https://nodejs.org |
| JDK | 17（Temurin/Oracle 均可） | https://adoptium.net |
| Android Studio | 最新稳定版 | https://developer.android.com/studio |

安装 Android Studio 后，通过 **SDK Manager** 安装：
- Android SDK Platform 35（或最新）
- Android SDK Build-Tools
- Android SDK Command-line Tools

配置环境变量：

```powershell
# 系统环境变量（示例路径，按实际安装位置调整）
ANDROID_HOME = C:\Users\<用户名>\AppData\Local\Android\Sdk
Path 追加: %ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin
JAVA_HOME 指向 JDK17 安装目录
```

---

## 二、先部署 Cloud Run 验权服务

1. 在工作区外生成 EC P-256 权益签名密钥：

```powershell
cd F:\GDZK\问道APP纯净版\app\server
npm ci
npm run check
npm test
npm run generate:entitlement-key -- D:\secure\gongdao-entitlement
```

2. 安装并登录 Google Cloud CLI 后部署。项目 ID、区域和 Firestore 地区必须按实际资源替换：

```powershell
.\deploy-cloud-run.ps1 `
  -ProjectId "你的项目ID" `
  -Region "asia-east1" `
  -FirestoreLocation "asia-east1" `
  -EntitlementKeyId "entitlement-v1" `
  -EntitlementPrivateKeyPath "D:\secure\gongdao-entitlement\entitlement-private-key.pem" `
  -EntitlementPublicJwkPath "D:\secure\gongdao-entitlement\entitlement-public-key.jwk.json"
```

脚本会将 HTTPS 验权 URL、当前 key ID 和公开 JWK 写入 `www/runtime-config.js`。私钥只进入 Secret Manager，不进入客户端。部署后的人工步骤仍包括：Play Console 服务账号授权、设置 RTDN Topic、激活商品和配置预算通知。详细说明见 `server/README.md`。

客户端支持多个公开密钥。密钥轮换时，先用新的 key ID 和 `-PrepareKeyRotation` 运行部署脚本并发布同时信任旧、新公钥的客户端；完成覆盖后，再以相同参数但不带该开关运行脚本，切换服务端签名私钥。旧公钥至少保留 72 小时，不能直接用新私钥覆盖同一个 key ID。

---

## 三、补全政策并运行发布预检

补全 `www/privacy-policy.html` 与 `www/terms.html` 中的运营主体、邮箱、地址、保存期限、适用法律和争议解决内容，将两页部署到长期公开的 HTTPS URL。然后运行：

```powershell
cd F:\GDZK\问道APP纯净版\app
$env:PUBLIC_PRIVACY_POLICY_URL = "https://你的域名/privacy-policy.html"
$env:PUBLIC_TERMS_URL = "https://你的域名/terms.html"
npm run preflight:release
```

预检会阻止以下常见事故：验权 URL/公开密钥为空、政策仍是草案、政策 URL 不是 HTTPS、`versionCode` 未递增、Web 文件未同步到 Android。不要绕过失败项。

---

## 四、同步与构建 AAB

```powershell
cd F:\GDZK\问道APP纯净版\app

# 1. 每次改动 runtime-config.js、政策或 Web 代码后都要重新同步
npx cap sync android

# 2. 首次发布时才生成上传密钥（已有密钥不得重建或替换）
cd android
keytool -genkeypair -v -keystore zhongkui.keystore -alias zhongkui -keyalg RSA -keysize 2048 -validity 10000

# 3. 在 android\keystore.properties 中配置签名。该文件和密钥均已被 .gitignore 排除。
#    只填写实际值，不要把密码写入 build.gradle，也不要提交或发送密钥文件。
#    storeFile=zhongkui.keystore
#    storePassword=<密钥库密码>
#    keyAlias=zhongkui
#    keyPassword=<密钥密码>

# 回到 app 根目录运行发布预检
cd ..

# 4. 设置本次正式包的新 versionCode，然后再次运行发布预检
$env:PUBLIC_PRIVACY_POLICY_URL = "https://你的域名/privacy-policy.html"
$env:PUBLIC_TERMS_URL = "https://你的域名/terms.html"
npm run preflight:release

# 5. 构建 AAB
cd android
.\gradlew.bat bundleRelease

# 产出：android\app\build\outputs\bundle\release\app-release.aab
```

---

## 五、Google Play Console 上架步骤

1. **创建应用**：Play Console → 创建应用 → 名称「公道钟馗」→ 默认语言 中文（简体）。
2. **创建内购商品**：创收 → 应用内商品 → 创建商品：
   - 商品 ID：`premium_unlock`（必须与代码一致）
   - 名称：结缘解锁完整版
   - 说明：一次结缘，永久开启无限演卦机缘
   - 定价：建议 ¥12（或等值美元）→ **激活商品**
3. **隐私政策**：将 `app\www\privacy-policy.html` 部署到任意可公开访问的网址（GitHub Pages / Gitee Pages / 自有服务器），填入「应用内容 → 隐私政策」。
4. **数据安全表单（Data safety）**：必须按正式部署后的真实数据流填写，不能直接声明“完全不收集”。当前设计中：
   - 摄像头画面仅在设备本地实时识别，不上传、不保存；摄像头权限用于核心手势功能。
   - 卦志默认只保存在设备本地。
   - 购买核验服务会接收 Google Play 购买令牌，但 Firestore 只保存令牌和订单号的 HMAC 哈希、核验/确认状态及时间戳，不保存原始令牌或原始订单号。明确无效令牌记录保留 7 天，RTDN 幂等记录最长 90 天，有效购买审计默认 400 天；应按 Play Console 当期字段和最终部署值如实申报。
   - 不向第三方出售数据；Google Play Billing、托管商和日志/监控服务是否构成数据处理或共享，应结合最终部署配置重新审查。
5. **内容分级**：填写问卷，类别选「工具/娱乐」。
6. **目标受众**：18 岁以上（含占卜内容，避免儿童受众误判）。
7. **测试要求**：先完成内部测试支付闭环；若是适用 Google Play 新个人开发者账号政策的账号，再按 Console 当时显示的封闭测试人数、持续时间及生产访问申请要求执行。
8. **上传 AAB** → 送审。

---

## 六、工程结构速览

```
app/
├── capacitor.config.json      # appId: com.gongdao.zhongkui
├── package.json               # @capacitor/* + cordova-plugin-purchase
├── www/                       # Web 资产（约 34MB）
│   ├── index.html             # 已本地化 MediaPipe + Play Billing 弹窗 + 系统分享
│   ├── zhongkui.js            # 可读源码，含 Premium 内购模块
│   ├── privacy-policy.html    # 隐私政策草案（发布前须补齐主体与联系方式）
│   ├── terms.html             # 条款与免责声明草案
│   ├── runtime-config.js      # HTTPS 购买验权地址；留空时购买与恢复会安全禁用
│   ├── 工厂2.0/               # 64 张卦牌 webp（已压缩）
│   ├── 底图.png               # 背景（已压缩）
│   └── vendor/mediapipe/      # Hands 运行时+模型（全离线）
├── android/                   # Capacitor Android 工程
├── server/                    # Cloud Run 验权、Firestore、RTDN、签名权益与部署脚本
└── scripts/release-preflight.mjs # 正式发布门禁
```

## 七、常见问题

- **内购测试不到真实价格**：在 Play Console「许可测试」中加入测试 Gmail 账号，测试账号走测试支付通道。
- **恢复购买无效**：确认商品已激活且应用通过 Play 商店渠道安装（侧载 APK 无法查询购买记录）。
- **已付款但暂未解锁**：不要重复付费；先联网使用“恢复购买”。客户端会区分 429、服务临时故障和真正无权益，订单可在服务恢复后再次核验。
- **换签名密钥后全部验签失败**：确认是否错误复用了旧 key ID，或先移除了旧公钥。按 `server/README.md` 的双公钥窗口恢复。
- **摄像头黑屏**：确认真机（非模拟器）测试，且已在系统弹窗中允许摄像头权限。
- **包体超限**：当前 www 约 34MB，AAB 产出预计 <40MB，符合 Play 要求。

---

## 八、送审前强制检查

- 将 `server/` 部署到 Cloud Run，配置最小权限 Google 服务账号、Android Publisher API、Firestore TTL、RTDN、最大实例数和预算告警。
- 确认部署脚本已经把正式验权 URL、当前 key ID 和公开 JWK 写入 `www/runtime-config.js`；URL 或公钥留空的包不能完成可靠购买与恢复。
- 补全隐私政策与条款中的运营主体、隐私/客服邮箱、联系地址、数据保存期限及适用法律；部署到长期公开 URL。
- 在 Play Console 创建并激活一次性商品 `premium_unlock`，配置应用签名、API 权限、RTDN、目标受众、内容分级与数据安全表单。
- 从 Google Play 内部测试轨道安装应用，使用许可测试账号完成购买、确认、恢复购买、退款/撤销与离线 72 小时缓存边界测试。
- 按 `server/INTERNAL_TEST_CHECKLIST.md` 保存每项测试证据；不能用侧载包代替内部轨道。
- 设置 `PUBLIC_PRIVACY_POLICY_URL`、`PUBLIC_TERMS_URL` 并执行 `npm run preflight:release`，必须零失败。
- 每次上传前递增 `versionCode`；保存并异地备份上传密钥，但不得把密钥、密码、服务账号 JSON 或 `.env` 提交到源码仓库。
