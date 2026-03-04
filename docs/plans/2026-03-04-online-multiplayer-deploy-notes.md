# Online Multiplayer Deploy Notes

## 目标部署形态

第一版联网房间按“单台公网服务器”设计：

- 一台服务器运行 `node server.js`
- 一个公网域名对外提供页面和 Socket.IO
- 房间状态保存在进程内存中
- 服务器重启后，房间与对局状态会丢失

这套方案的目标不是长期平台化，而是尽快把邀请制联网能力稳定上线。

## 环境变量

建议从 [`.env.example`](/C:/Users/42599/guandan_Game2.0/.env.example) 复制一份本地环境文件，再按实际域名修改。

关键变量说明：

- `HOST`
  - 生产建议设为 `0.0.0.0`
  - 本地开发默认是 `localhost`
- `PORT`
  - Node 服务监听端口
  - 默认 `3003`
- `APP_ORIGIN`
  - 你的真实公网访问地址
  - 例如 `https://guandan.example.com`
- `SOCKET_CORS_ORIGINS`
  - 允许访问 Socket.IO 的来源
  - 多个域名用逗号分隔
- `NEXT_PUBLIC_SOCKET_URL`
  - 只有当页面域名与 Socket 服务域名不同，才需要显式设置
  - 单域名部署建议留空，使用同源回连
- `RECONNECT_GRACE_MS`
  - 玩家断线后保留原座位的时间
- `ROOM_IDLE_TTL_MS`
  - 未开局房间长时间空闲后的回收时间
- `RATE_LIMIT_WINDOW_MS`
  - 建房/入房限流窗口
- `RATE_LIMIT_MAX`
  - 限流窗口内允许的最大尝试次数

## 开发与生产默认值

- 开发环境
  - `HOST=localhost`
  - `PORT=3003`
  - 客户端默认连接 `http://localhost:3003`
- 生产环境
  - `HOST=0.0.0.0`
  - `PORT=3003`，或由平台注入
  - 客户端默认使用同源 Socket 连接
  - 如果未设置 `SOCKET_CORS_ORIGINS`，会回退到 `APP_ORIGIN`

## 反向代理要求

部署在 Nginx、Caddy、Traefik 或云平台网关之后时，必须同时满足：

- 普通 HTTP 请求能转发到 Node 服务
- `/socket.io/` 支持 WebSocket Upgrade
- 反向代理不要拦截长连接
- 公网 HTTPS 证书与 `APP_ORIGIN` 保持一致

Nginx 至少需要保证以下语义：

```nginx
location /socket.io/ {
    proxy_pass http://127.0.0.1:3003;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}

location / {
    proxy_pass http://127.0.0.1:3003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

## Ubuntu 手动部署补充

如果你使用 Ubuntu 手动部署当前版本，建议固定一个项目目录，例如 `/srv/guandan/current`，并在该目录内完成 `.env`、构建产物和运行进程的管理。

推荐顺序：

```bash
cp .env.example .env
npm install
npm run build
npm start
```

在正式启动前，可以先运行 [scripts/ubuntu-deploy-check.sh](/C:/Users/42599/guandan_Game2.0/scripts/ubuntu-deploy-check.sh) 做一次自检；Nginx 站点配置建议从 [deploy/nginx/guandan.conf.example](/C:/Users/42599/guandan_Game2.0/deploy/nginx/guandan.conf.example) 起步，再按实际域名、证书和站点目录调整。

完整的 Ubuntu 目录约定、Nginx 启用步骤、reload 命令和首轮联机烟雾测试见 [docs/plans/2026-03-04-ubuntu-manual-deploy-runbook.md](/C:/Users/42599/guandan_Game2.0/docs/plans/2026-03-04-ubuntu-manual-deploy-runbook.md)。

## 首次部署检查清单

上线前至少确认以下项目：

- 已执行 `npm install`
- 已执行 `npm run build`
- 生产进程能以 `npm start` 或等价方式启动
- `HOST`、`PORT`、`APP_ORIGIN` 与部署环境一致
- `SOCKET_CORS_ORIGINS` 包含真实访问域名
- 反向代理已开启 WebSocket 支持
- 浏览器访问首页后可以成功创建房间
- 第二个浏览器或设备能通过邀请链接加入
- 刷新页面后原玩家能在 `RECONNECT_GRACE_MS` 内回到座位

## 已知限制

这一版部署仍然有明确限制：

- 不支持多实例共享房间
- 不支持跨进程恢复对局
- 不支持持久化存档
- 不包含账号、匹配和人机能力

如果后续要走正式平台化路线，下一步优先级应该是 Redis 房间状态和账号体系，而不是先做 AI。
