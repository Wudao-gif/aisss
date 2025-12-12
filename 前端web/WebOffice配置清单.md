# 阿里云 WebOffice 配置清单 ✅

## 📋 配置步骤（按顺序完成）

### ☐ 步骤 1: 创建 IMM Project

1. 登录 [智能媒体管理控制台](https://imm.console.aliyun.com/)
2. 点击「创建项目」
3. 填写信息：
   - **项目名称**: `library-preview`
   - **地域**: 与 Bucket 相同（例如：华东1-杭州）
4. 点击「确定」

**验证**: 在 IMM 控制台看到新创建的 Project

---

### ☐ 步骤 2: 绑定 IMM Project 到 Bucket

1. 登录 [OSS 控制台](https://oss.console.aliyun.com/)
2. 进入你的 Bucket
3. 点击「数据处理」→「智能媒体管理」
4. 选择刚创建的 IMM Project
5. 点击「绑定」

**验证**: 在 Bucket 设置中看到已绑定的 IMM Project

---

### ☐ 步骤 3: 绑定自定义域名

1. 在 OSS 控制台，进入 Bucket
2. 点击「传输管理」→「域名管理」
3. 点击「绑定域名」
4. 填写自定义域名（例如：`static.example.com`）
5. 在域名 DNS 服务商处添加 CNAME 记录：
   ```
   static.example.com  →  your-bucket.oss-cn-hangzhou.aliyuncs.com
   ```
6. 等待 DNS 生效（10 分钟内）

**验证**: 访问 `https://static.example.com/test.txt` 能正常访问

---

### ☐ 步骤 4: 配置环境变量

复制 `.env.example` 到 `.env.local`，填写以下配置：

```env
# 阿里云 OSS 配置
NEXT_PUBLIC_OSS_REGION="oss-cn-hangzhou"
NEXT_PUBLIC_OSS_BUCKET="your-bucket-name"
NEXT_PUBLIC_OSS_CUSTOM_DOMAIN="https://static.example.com"  # ⭐ 必填
OSS_ACCESS_KEY_ID="LTAI*********************"
OSS_ACCESS_KEY_SECRET="your-secret-key"

# WebOffice 预览配置（可选）
NEXT_PUBLIC_WEBOFFICE_ALLOW_EXPORT="true"
NEXT_PUBLIC_WEBOFFICE_ALLOW_PRINT="true"
NEXT_PUBLIC_WEBOFFICE_ALLOW_COPY="true"
NEXT_PUBLIC_WEBOFFICE_WATERMARK_TEXT="内部资料"
```

**验证**: 检查 `.env.local` 文件是否存在且配置正确

---

### ☐ 步骤 5: 重启开发服务器

```bash
npm run dev
```

**验证**: 服务器启动成功，显示 `Ready in X.Xs`

---

### ☐ 步骤 6: 测试预览功能

1. 访问测试页面：`http://localhost:3002/test-preview`
2. 点击「Word 示例文档」
3. 验证：
   - [ ] 文档加载成功（1-2秒）
   - [ ] 显示水印（如果配置了）
   - [ ] 底部显示「阿里云 WebOffice」

**验证**: 文档预览正常工作

---

## 🔍 快速检查清单

### 必须配置项 ⭐

- [ ] IMM Project 已创建
- [ ] IMM Project 已绑定到 Bucket
- [ ] 自定义域名已绑定
- [ ] DNS CNAME 记录已添加
- [ ] `NEXT_PUBLIC_OSS_CUSTOM_DOMAIN` 已配置
- [ ] `OSS_ACCESS_KEY_ID` 已配置
- [ ] `OSS_ACCESS_KEY_SECRET` 已配置

### 可选配置项

- [ ] 水印文字已配置
- [ ] 权限控制已配置（导出/打印/复制）
- [ ] 水印样式已配置（大小/透明度/颜色）

---

## ❓ 常见问题快速排查

### 问题 1: 预览失败

**检查清单**:
- [ ] IMM Project 是否已创建？
- [ ] IMM Project 是否已绑定到 Bucket？
- [ ] 自定义域名是否已绑定？
- [ ] DNS CNAME 是否已生效？
- [ ] 环境变量是否配置正确？

---

### 问题 2: 水印不显示

**检查清单**:
- [ ] `NEXT_PUBLIC_WEBOFFICE_WATERMARK_TEXT` 是否配置？
- [ ] 水印透明度是否为 0？
- [ ] 水印颜色是否与背景色相同？

---

### 问题 3: 签名错误

**检查清单**:
- [ ] `OSS_ACCESS_KEY_ID` 是否正确？
- [ ] `OSS_ACCESS_KEY_SECRET` 是否正确？
- [ ] Region 配置是否正确？
- [ ] 是否使用了自定义域名？

---

## 📞 获取帮助

### 官方文档

- [WebOffice 在线预览](https://help.aliyun.com/zh/oss/user-guide/online-object-preview)
- [智能媒体管理 IMM](https://help.aliyun.com/zh/imm/)
- [OSS 自定义域名](https://help.aliyun.com/zh/oss/access-buckets-via-custom-domain-names)

### 技术支持

- 钉钉用户群：88490020073

---

## 🎉 完成！

当所有步骤都完成后，你就可以使用阿里云 WebOffice 在线预览功能了！

**测试地址**: `http://localhost:3002/test-preview`

**祝你使用愉快！** 🚀

