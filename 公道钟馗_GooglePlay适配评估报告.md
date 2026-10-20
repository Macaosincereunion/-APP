# 公道钟馗·问道 — Google Play 适配评估报告

**版本：** v1.0
**日期：** 2026-10-07
**评估对象：** WenDao_0714 完整工程（原 App Store 上架方案）
**目标平台：** Google Play（Android）
**结论：** 不能直接上传，核心架构可复用（~70%），需完成三级改造

---

## 一、总体结论

当前工程是面向 iOS App Store 的 **Capacitor 8.x + WebView** 方案，采用的「匿名设备 UUID + 平台 IAP + 独立后端收据验证」架构对 Google Play **完全成立且可复用**。

但存在 6 个阻断性问题，核心是：**Android 原生层（Capacitor 平台 + Billing 插件）完全未实现**。

| 维度 | 评估 |
|------|------|
| 架构设计（匿名订阅 PRD） | ✅ 95% 可直接复用 |
| 前端游戏引擎与 UI | ✅ 100% 复用 |
| 后端验证服务 | ⚠️ 85% 复用（Google 分支已实现，待配置） |
| Android 原生层 | ❌ 0%（未开始） |
| 商店素材 | ⚠️ 70% 需改写为 Play 规范 |
| 隐私合规 | ⚠️ 需按 Play 数据安全表单调整 |

**工作量预估：** 纯技术工作 3–4 天 + 封闭测试 14 天（Google 强制要求，不可压缩）= **总周期约 3 周**。

---

## 二、工程现状盘点（WenDao_0714 完整包）

### 2.1 文件完整性核对

| 文件/目录 | 状态 | 说明 |
|-----------|------|------|
| `index.html`（65KB） | ✅ 完整 | 已删登录注册 UI，含支付页 + 试玩闸门 |
| `zhongkui-min_0625.js`（243KB） | ✅ 完整 | 游戏引擎（混淆压缩），卡牌引用指向 `工厂2.0/` |
| `src/device-identity.js` | ✅ 完整 | UUID v4 生成 + 安全存储（含降级逻辑） |
| `src/subscription-client.js` | ✅ 完整 | 订阅查询/收据验证/恢复购买 + 本地缓存 |
| `src/iap-bridge.js` | ⚠️ 接口空壳 | 原生环境全部 `throw`，待实现 |
| `src/auth-bridge.js` | ✅ 完整 | 旧接口兼容桥接 |
| `src/supabase-config.js` | 🗑️ 死代码 | 已不被引用，应删除 |
| `backend/server.js`（15.8KB） | ✅ 完整 | 含 Apple + Google 双平台验证逻辑 |
| `backend/schema.sql` | ⚠️ 有缺陷 | 含 `DROP TABLE`，需修复 |
| `backend/.env.example` | ✅ 完整 | 含 Apple/Google 凭证模板 |
| `mediapipe/`（13 个文件，~28MB） | ✅ 完整 | wasm/tflite/data 全部本地化 |
| `工厂2.0/`（67 张 webp 卡牌） | ✅ 完整 | 64 卦 + 背面图 |
| `privacy-policy.html` | ⚠️ 待补充 | 缺广告 ID 声明 |
| `capacitor.config.ts` | ⚠️ 仅 iOS | 无 Android 配置 |
| `package.json` | ❌ 缺依赖 | 无 `@capacitor/android` |
| `appstore-assets.txt` | ⚠️ iOS 专属 | 需改写为 Play 素材清单 |

### 2.2 架构数据流（已验证闭环）

```
App 启动 → DeviceIdentity 生成/读取 UUID
       → SubscriptionClient 查询后端订阅状态
       → 试玩计数（localStorage, MAX_TRIAL=1）
       → 耗尽后引导支付页
       → IAPBridge.purchase（原生，未实现）
       → 收据透传后端验证（已实现 Apple/Google 双分支）
       → 后端强制校验 appAccountToken/obfuscatedAccountId == X-Device-ID
       → 写入 subscriptions 表 → 解锁
```

---

## 三、第一级：阻断性问题（P0，不解决无法上架）

### 3.1 Capacitor 未配置 Android 平台

**现象：** `node_modules/@capacitor/` 仅有 `ios`，无 `android`；`package.json` 依赖中也无 `@capacitor/android`。

**修复：**

```bash
npm install @capacitor/android
npx cap add android
npx cap sync android
```

并在 `capacitor.config.ts` 中补充 Android 配置（建议 `androidScheme: 'https'`，保证 MediaPipe `getUserMedia` 的安全上下文）。

### 3.2 Android IAP 原生插件完全未实现

**现象：** `src/iap-bridge.js` 在原生环境下三个核心方法全部抛异常：

```javascript
throw new Error('[IAPBridge] 原生环境尚未实现 purchase，请在 Mac 端补充 Capacitor 插件');
```

**修复：** 实现自定义 Capacitor 插件（Kotlin），要求：

- 集成 Google Play Billing Library 5+
- `purchase()`：调用 `launchBillingFlow()`，**必须** `setObfuscatedAccountId(deviceId)`
- `restorePurchases()`：调用 `queryPurchasesAsync()` 查询历史购买
- 返回结构必须含 `platform: 'android'`、`receipt: purchaseToken`、`productId`、`transactionId`
- 购买完成后调用 `acknowledgePurchase()`（一次性商品 3 天内未确认会被 Google 自动退款）

### 3.3 支付平台字段默认值写死 iOS

**位置：** `index.html` 第 764 行附近

```javascript
await window.SubscriptionClient.verifyReceipt(
  result.platform || 'ios',   // ⚠️ Android 未返回 platform 时错走 Apple 验证
  result.receipt,
  result.productId
);
```

**修复：** Android 插件实现中必须返回 `platform: 'android'`；建议在 JS 侧增加按 `Capacitor.getPlatform()` 的兜底判断。

### 3.4 卡牌图片路径不一致

**现象：**

| 引用位置 | 路径 | 存在性 |
|----------|------|--------|
| index.html 卡牌 `src` / `onerror` | `cards/卡片.png` | ❌ 不存在 |
| 引擎 zhongkui-min_0625.js | `工厂2.0/N.webp` | ✅ 存在 |
| index.html 底图 | `底图.png`（同级，7.4MB） | ✅ 存在 |

**影响：** 结果页本卦/变卦卡牌空白。

**修复（二选一）：**
1. 创建 `cards/卡片.png`（可复制 `工厂2.0/背面.webp` 转换）
2. 修改 index.html 中 `onerror` 为 `this.src='工厂2.0/背面.webp'`

**附加优化：** `底图.png` 7.4MB 过大，建议压缩为 WebP（预计可降至 500KB 内），减少 APK/AAB 体积。

### 3.5 开发模式后门（发布安全事故级风险）

**位置：** `src/subscription-client.js`

```javascript
const API_BASE_URL = window.__GONGDAO_API_BASE__ || 'https://your-api-domain.com';

function isDevMode() {
  return API_BASE_URL.includes('your-api-domain') || ...;
}
// dev 模式下 verifyReceipt() 直接模拟成功 → 不付费即解锁
```

**修复（发布前检查清单项）：**
1. 配置真实后端地址
2. 增加发布构建校验：扫描产物中是否残留 `your-api-domain` / `localhost` 关键字
3. 建议改为显式开关：`const DEV_MODE = false;`（发布版硬编码 false）

### 3.6 Supabase CDN 残留（死代码）

**位置：** `index.html` 第 39 行

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

**影响：** 架构改造后 Supabase 已弃用，该请求在离线/弱网环境下挂起加载。

**修复：** 删除该 script 标签及 `src/supabase-config.js` 文件、`package.json` 中的 `@supabase/supabase-js` 依赖。

---

## 四、第二级：高风险问题（P1，可能导致审核被拒）

### 4.1 Play 数据安全表单 ≠ App Store 隐私标签

不能照抄 iOS 的全"否"策略，Play 需如实填写：

| 数据类型 | Play 表单填写 | 理由 |
|----------|--------------|------|
| 设备或其他标识符 | ✅ 收集 → 应用功能 → 不关联身份 → 加密传输 | 后端存储匿名 UUID 与交易映射 |
| 购买历史 | ✅ 收集 → 应用功能 | 收据验证需平台交易记录 |
| 照片/视频 | ❌ 不收集 | 摄像头画面仅本地 MediaPipe 处理 |
| 个人信息 | ❌ 不收集 | 无账户体系 |
| 数据加密 | ✅ 传输中加密（HTTPS） | |
| 删除请求机制 | 需说明（卸载即删除本地数据） | |

### 4.2 隐私政策 URL 未托管

`privacy-policy.html` 已完成但无公网地址。Play 提交时必填。

**修复：** 托管至 GitHub Pages / Cloudflare Pages，并补充一条声明：

> 本应用不收集 Google Advertising ID 或任何广告标识符，不展示第三方广告。

### 4.3 `schema.sql` 含破坏性语句

```sql
DROP TABLE IF EXISTS subscriptions;  -- ⚠️ 生产环境重复执行会丢全部交易数据
```

**修复：** 改为 `CREATE TABLE IF NOT EXISTS`。

### 4.4 后端 Google 凭证缺失时启动崩溃

`initGoogleAuth()` 在凭证未配置时直接 `throw`，若先上 iOS 会导致整个服务不可用。

**修复：** 延迟初始化 + 按平台路由前检查配置可用性。

### 4.5 新开发者账号封闭测试要求

Google Play 对新注册的**个人开发者账号**强制要求：**封闭测试轨道运行 ≥14 天，且 ≥12 名（部分类目 20 名）测试者持续参与**。

**行动项：** 提前在社群（小红书/抖音粉丝）招募测试者并收集 Gmail，与开发并行启动。

---

## 五、第三级：待补充工作（P2，不阻断但影响质量）

### 5.1 Play 商店专属素材

| 素材 | 规格 | 状态 |
|------|------|------|
| Feature Graphic（置顶大图） | 1024×500 PNG/JPG | ❌ 待制作 |
| 应用图标 | 512×512 PNG（不可透明） | ❌ 待制作（现有 icon_180px.zip 为 iOS 规格） |
| 手机截图 | ≥1080×1920，至少 2 张 | 可按 appstore-assets.txt 的截图内容规划执行 |
| 商品详情文案 | 简短描述 80 字符 + 完整描述 4000 字符 | 可改写自 App Store 版本（Play 无关键词字段，关键词需融入描述） |
| IARC 内容分级问卷 | 在线填写 | 注意勿误勾"模拟赌博"，占卜类按娱乐工具填写 |

### 5.2 Play Console 商品配置

- 商品 ID：`com.gongdao.zhongkui.vip.forever`（与前端 `iap-bridge.js` 中 `DEFAULT_PRODUCTS` 一致）
- 类型：一次性商品（非消耗品，对应"永久解锁"）
- 许可测试：在 Play Console 添加测试 Gmail，沙盒环境验证购买/恢复/退款全流程

### 5.3 试玩闸门的绕过风险（设计层面提示）

`my_trial_count` 存于 localStorage，**卸载重装即重置**。买断验证在后端，不影响付费安全，但试玩次数可被绕过。当前设计可接受（获客优先），二期可考虑设备指纹或后端计数。

---

## 六、可直接复用的资产清单 ✅

| 资产 | 复用度 | 说明 |
|------|--------|------|
| 匿名订阅架构 PRD | 95% | 原生包含 Android Billing / Google Play Developer API 设计 |
| 游戏引擎 + UI | 100% | 六爻算法、手势识别、卡牌系统零改动 |
| MediaPipe 本地化（28MB） | 100% | 离线可用，无 CDN 依赖 |
| 卡牌资源（67 张 webp） | 100% | 完整 |
| 后端 server.js | 85% | Google `subscriptionsv2` 验证 + obfuscatedAccountId 强制比对已实现，仅需配凭证 |
| 隐私政策 | 80% | 补广告 ID 声明即可 |
| 返回键/状态栏/启动屏处理 | 100% | index.html 中 Capacitor 插件调用对 Android 通用 |
| 试玩→付费转化闸门 | 100% | MAX_TRIAL 逻辑平台无关 |

---

## 七、改造执行计划

### 阶段 1：P0 阻断修复（约 1 天）

1. 安装 `@capacitor/android`，`npx cap add android && npx cap sync`
2. 删除 Supabase CDN 引用与死代码
3. 修复卡牌路径（cards/卡片.png）
4. 封堵 dev 后门（配置真实 API 地址 + 构建校验）
5. `schema.sql` 改为 `CREATE TABLE IF NOT EXISTS`

### 阶段 2：Android IAP 插件（约 1–2 天）

1. 创建自定义 Capacitor 插件（Kotlin + Billing Library 5+）
2. 实现 `getProducts / purchase / restorePurchases / finishTransaction`
3. `setObfuscatedAccountId(deviceId)` 绑定
4. 购买后 `acknowledgePurchase`（防 3 天自动退款）

### 阶段 3：后端部署与联调（约半天）

1. 部署 server.js（含 PostgreSQL）
2. 配置 Google Service Account（Play Console → API 访问）
3. 创建 Play 商品 + 许可测试账号
4. 沙盒全流程：购买 → 验证 → 恢复 → 退款降级

### 阶段 4：合规与素材（约半天，与封闭测试并行）

1. 隐私政策托管 + 广告 ID 声明
2. Play 数据安全表单（按 4.1 表格）
3. IARC 问卷 + Feature Graphic + 512 图标
4. 商品详情文案改写

### 阶段 5：封闭测试与上架（14 天固定 + 审核 3–7 天）

1. 封闭轨道上传 AAB（需启用 Play App Signing）
2. 12–20 名测试者持续测试 14 天
3. 达标后申请正式版发布

**总计：技术工作 3–4 天 + 封闭测试 14 天 + 审核 ≈ 3 周**

---

## 八、风险登记册

| 风险 | 等级 | 应对 |
|------|------|------|
| 忘记封堵 dev 后门 → 免费解锁流出 | 🔴 高 | 发布构建脚本强制扫描占位符关键字 |
| Billing 3 天未确认自动退款 | 🔴 高 | 插件内强制 acknowledgePurchase |
| 数据安全表单与隐私政策不一致被拒 | 🟡 中 | 三者（表单/政策/代码行为）交叉核对 |
| 卡牌路径遗漏导致结果页空白 | 🟡 中 | 封闭测试用例覆盖"本卦+变卦"双场景 |
| 封闭测试人数不足延期 | 🟡 中 | 提前招募，预留 20 人冗余 |
| Google 凭证配置错误导致验证 500 | 🟢 低 | 后端加 `/health` 检查 + 凭证预检日志 |

---

## 九、附：关键技术参数速查

| 项 | 值 |
|----|-----|
| 包名 | `com.gongdao.zhongkui` |
| 商品 ID | `com.gongdao.zhongkui.vip.forever`（一次性商品） |
| 设备 ID 存储 key | `gdzk_device_id` |
| 订阅缓存 key | `gdzk_subscription_cache`（TTL 1 小时） |
| 试玩上限 | `MAX_TRIAL = 1` |
| 后端接口 | `GET /api/subscription-status`、`POST /api/verify-receipt`、`POST /api/restore-purchase` |
| 鉴权 Header | `X-Device-ID: <UUID v4>` |
| Google 验证 API | `androidpublisher.purchases.subscriptionsv2.get` |
| 安全校验 | `obfuscatedExternalAccountId === X-Device-ID` 强制比对 |
