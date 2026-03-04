# Ubuntu Manual Deploy Runbook

## 目标

这份 runbook 面向当前“单台公网服务器 + 单个 Node 进程 + Nginx 反向代理”的上线方式，适合先把邀请制联网房间版本部署到一台 Ubuntu 服务器上做真实联调。

## 目录约定

建议在 Ubuntu 服务器上使用固定目录，例如：

```text
/srv/guandan/current
```

这个目录内应包含仓库代码、`.env`、`.next` 构建产物，以及 `node_modules`。如果你后续要手动更新版本，也建议继续复用这个目录约定，避免 Nginx、日志和运维脚本路径漂移。

## 1. 放置代码

把仓库内容放到服务器目录后，进入项目根目录：

```bash
cd /srv/guandan/current
```

## 2. 手动创建 `.env`

先复制示例文件：

```bash
cp .env.example .env
```

至少确认以下变量已经按真实环境填写：

- `HOST=0.0.0.0`
- `PORT=3003`
- `APP_ORIGIN=https://your-domain.example`
- `SOCKET_CORS_ORIGINS=https://your-domain.example`

单域名部署通常不需要设置 `NEXT_PUBLIC_SOCKET_URL`。

## 3. 安装依赖并构建

```bash
npm install
npm run build
```

如果 `npm run build` 没有成功，不要继续启动服务，先修正依赖、环境变量或构建错误。

## 4. 运行 Ubuntu 自检脚本

在项目根目录执行：

```bash
bash scripts/ubuntu-deploy-check.sh
```

自检脚本会确认：

- `node` 与 `npm` 可用
- `package.json`、`server.js`、`.env` 存在
- `.env` 中包含 `HOST`、`PORT`、`APP_ORIGIN`、`SOCKET_CORS_ORIGINS`
- `.next` 构建产物已经生成

如果脚本返回非 `0`，先修复缺失项，再继续上线。

## 5. 启动 Node 进程

最简单的启动方式：

```bash
npm start
```

如果你不想让进程绑定到当前终端，可以手动用 `nohup` 保持它运行：

```bash
nohup npm start > ./guandan.log 2>&1 &
```

这一版不引入 `systemd`，也不处理多实例或进程守护。

## 6. 配置 Nginx

先把模板复制到 Ubuntu Nginx 配置目录：

```bash
sudo cp deploy/nginx/guandan.conf.example /etc/nginx/sites-available/guandan.conf
```

然后按你的真实域名修改：

- `server_name`
- HTTPS 证书相关配置
- 如有需要，静态日志路径和额外安全头

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/guandan.conf /etc/nginx/sites-enabled/guandan.conf
sudo nginx -t
sudo systemctl reload nginx
```

模板文件位置见 [deploy/nginx/guandan.conf.example](/C:/Users/42599/guandan_Game2.0/deploy/nginx/guandan.conf.example)。

## 7. 首轮上线烟雾验证

按下面顺序做一次最小联机检查：

1. 浏览器访问 `APP_ORIGIN` 对应域名，确认首页可打开。
2. 创建一个房间，确认页面没有立即报错。
3. 用第二个浏览器或第二台设备打开邀请链接并成功入房。
4. 两边都能看到实时状态变化，说明 `/socket.io/` WebSocket 转发正常。
5. 刷新其中一个玩家页面，确认能在 `RECONNECT_GRACE_MS` 时间内回到原座位。

如果首页能打开但房间事件不同步，优先检查 Nginx 中 `/socket.io/` 的 Upgrade 头和 `proxy_pass`。

## 相关文件

- 部署概览: [README.md](/C:/Users/42599/guandan_Game2.0/README.md)
- 单机联机部署说明: [docs/plans/2026-03-04-online-multiplayer-deploy-notes.md](/C:/Users/42599/guandan_Game2.0/docs/plans/2026-03-04-online-multiplayer-deploy-notes.md)
- Ubuntu 自检脚本: [scripts/ubuntu-deploy-check.sh](/C:/Users/42599/guandan_Game2.0/scripts/ubuntu-deploy-check.sh)
- Nginx 模板: [deploy/nginx/guandan.conf.example](/C:/Users/42599/guandan_Game2.0/deploy/nginx/guandan.conf.example)
