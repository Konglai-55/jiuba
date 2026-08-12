# 快速开始

1. 在 `.env.local` 配置 `S3_ENDPOINT`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`、`S3_BUCKET_NAME` 和 `S3_PUBLIC_BASE_URL`。
2. 执行 `npm install`。
3. 执行 `npm run dev`。
4. 打开 <http://localhost:3000>。

数据和媒体均保存在 S3；项目不再使用 Neon、PostgreSQL、Drizzle 或 `DATABASE_URL`。

可访问 <http://localhost:3000/api/health> 检查 S3 连接状态。
