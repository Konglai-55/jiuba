# 酒馆推荐网站

Next.js 16 + React 19 的酒馆内容展示与后台管理网站。项目已经完全移除 Neon/PostgreSQL，业务数据和媒体文件统一保存到 S3 兼容对象存储。

## 数据存储

- 媒体文件：`media/`
- 首页卡片：`__jiuba_data__/v1/nav-cards/`
- 内容卡片：`__jiuba_data__/v1/content-cards/`
- 地区：`__jiuba_data__/v1/regions/`
- 网站设置：`__jiuba_data__/v1/site-settings/`
- 点击事件：`__jiuba_data__/v1/click-events/`
- 下载记录：`__jiuba_data__/v1/download-records/`
- 页面密码：`__jiuba_data__/v1/page-passwords/`
- 管理员密码：`__jiuba_data__/v1/private/admin-password.json`

普通业务对象使用 JSON。管理员密码和页面密码先使用 scrypt 哈希，再使用 AES-256-GCM 加密保存。`/api/file` 禁止访问内部数据前缀。

## 环境变量

在 `.env.local` 和部署平台中配置：

```env
S3_ENDPOINT=https://your-s3-endpoint.example
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_BUCKET_NAME=your_bucket
S3_PUBLIC_BASE_URL=https://your-public-base.example/your_bucket

# 建议在生产环境配置独立密钥；未配置时从 S3_SECRET_KEY 派生
S3_DATA_ENCRYPTION_KEY=use-a-long-independent-secret-in-production
```

不再需要 `DATABASE_URL`。

当前桶如果已经产生了私密对象，应先在旧 S3 凭据仍有效时配置 `S3_DATA_ENCRYPTION_KEY` 并访问一次网站，让系统自动重新加密，然后再轮换 S3 凭据。

## 本地运行

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。首次读取首页卡片时，如果 S3 中还没有业务数据，系统会自动写入 4 条默认卡片。

## 验证

```bash
npx tsc --noEmit
npm run build
```

访问 `/api/health` 可检查 S3 数据存储连接。

## 说明

旧 Neon 项目因计算额度耗尽而无法读取，因此本次切换无法自动复制其中的历史记录。当前 S3 数据从默认卡片开始，之后所有新增、修改、统计和下载记录都直接写入 S3。
