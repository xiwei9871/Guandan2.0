# Ubuntu Manual Deploy Support Design

## 目标

为当前“单机公网邀请制房间”版本补齐 Ubuntu 手动部署支撑，让项目可以按 `Node 进程 + Nginx` 模式更顺利地完成首次上线与联调。

## 约束

- 部署目标系统是 Ubuntu
- 第一版采用手动 `npm start` 启动，不引入 `systemd`
- 不引入 Docker、Compose、Redis、数据库或账号系统
- 不做自动安装脚本，只提供可复用模板、自检脚本和明确文档

## 方案

### 1. 固定部署形态

部署形态固定为：

- 代码放在 Ubuntu 服务器目录中
- 使用 `npm install` 安装依赖
- 使用 `npm run build` 构建
- 使用 `npm start` 启动 Node 进程
- 使用 Nginx 反代页面与 `/socket.io/`

Node 服务继续使用当前 `server.js`，不新增新的运行入口。

### 2. 提供可直接改的 Nginx 模板

新增一个仓库内模板文件，给出最小可运行配置：

- `server_name`
- `location /`
- `location /socket.io/`
- WebSocket Upgrade 头
- 指向本地 Node 进程端口

模板不直接写死 HTTPS 证书路径，避免和具体机器环境耦合。

### 3. 提供 Ubuntu 自检脚本

新增一个只读脚本，重点检查：

- `node`、`npm` 是否可用
- 项目目录下是否存在 `.env`
- `.env` 中是否声明核心变量
- 是否存在 `.next` 构建产物
- 是否可检测到 `server.js`
- 是否可检测到 `package.json`

脚本只报告状态，不自动修改系统，也不自动安装依赖。

### 4. 补齐部署文档

文档覆盖以下顺序：

1. 把代码放到 Ubuntu 服务器
2. 创建 `.env`
3. 安装依赖
4. 构建
5. 启动 Node
6. 配置 Nginx
7. 验证网页和 Socket.IO 联通

README 保持概览性，详细操作放到独立部署文档。

## 不做的内容

- `systemd` service
- Dockerfile / Compose
- 一键安装脚本
- HTTPS 自动签发
- 真实云服务器自动化部署

## 验收标准

- 仓库内存在 Ubuntu 版 Nginx 配置模板
- 仓库内存在 Ubuntu 自检脚本
- README 和部署文档可指导手动上线
- 新增脚本有测试或最小执行验证
- 项目测试和生产构建保持通过
