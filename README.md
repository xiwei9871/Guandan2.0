# 掼蛋在线游戏 (Guandan Online)

一个基于Next.js和Socket.io的4人局域网掼蛋对战游戏。

## 项目特性

- ✅ 实时多人在线对战
- ✅ 完整的掼蛋游戏规则
- ✅ 响应式UI设计
- ✅ WebSocket即时通信
- ✅ 房间系统
- ✅ 队伍协作
- ✅ 手牌管理
- ✅ 游戏状态同步

## 技术栈

- **前端框架**: Next.js 15 (App Router)
- **UI样式**: Tailwind CSS
- **类型系统**: TypeScript
- **实时通信**: Socket.io
- **状态管理**: React Hooks
- **开发环境**: Node.js 18+

## 快速开始

### 环境要求

- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器
- 现代浏览器（Chrome、Firefox、Edge、Safari）

### 安装步骤

1. **克隆项目**

```bash
git clone <repository-url>
cd guandan_Game2.0
```

2. **安装依赖**

```bash
npm install
```

3. **启动开发服务器**

```bash
npm run dev
```

4. **访问应用**

打开浏览器访问: [http://localhost:3000](http://localhost:3000)

### 生产部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 项目结构

```
guandan_Game2.0/
├── app/                      # Next.js App Router
│   ├── api/socket/          # Socket.io API路由
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 首页
│   └── room/[roomId]/       # 游戏房间页面
├── components/              # React组件
│   ├── game/               # 游戏相关组件
│   │   ├── HandCards.tsx   # 手牌显示组件
│   │   └── PlayerCard.tsx  # 玩家卡片组件
│   ├── GameRoom.tsx        # 游戏房间主组件
│   └── HomePage.tsx        # 首页组件
├── hooks/                   # 自定义React Hooks
│   ├── useSocket.ts        # Socket.io连接Hook
│   └── useCardSelection.ts # 卡片选择Hook
├── lib/                     # 核心逻辑库
│   ├── game/               # 游戏逻辑
│   │   ├── cardChecker.ts  # 牌型检测
│   │   ├── deck.ts         # 牌堆管理
│   │   └── gameEngine.ts   # 游戏引擎
│   ├── socket/             # Socket.io服务器
│   │   └── server.ts       # Socket服务器实现
│   ├── constants.ts        # 常量定义
│   └── types.ts            # TypeScript类型定义
├── docs/                    # 文档
│   └── rules.md            # 游戏规则说明
├── public/                  # 静态资源
├── TESTING.md              # 测试计划
├── BUGS.md                 # Bug报告
└── README.md               # 项目说明
```

## 游戏玩法

### 基本规则

1. **玩家配置**
   - 4名玩家，分为两队
   - 红队：南、北
   - 蓝队：东、西

2. **游戏流程**
   - 创建或加入房间
   - 4人全部准备后开始游戏
   - 系统自动发牌（每人27张）
   - 按顺序出牌，先出完牌的一方获胜

3. **牌型**
   - 单张、对子、三张
   - 三带一、三带二
   - 顺子、连对
   - 炸弹、王炸
   - 同花顺

详细规则请查看: [docs/rules.md](docs/rules.md)

### 操作说明

1. **准备游戏**
   - 点击"准备"按钮
   - 等待其他玩家准备
   - 全部准备后点击"开始游戏"

2. **选择手牌**
   - 点击手牌进行选择
   - 再次点击取消选择
   - 选中卡片会上移显示

3. **出牌**
   - 选择要出的牌
   - 点击"出牌"按钮
   - 或点击"不要"跳过本轮

4. **特殊牌**
   - 级牌：当前等级的牌
   - 逢人配：红桃级牌，可作任意牌使用

## 开发指南

### 添加新功能

1. **添加新的牌型**
   - 编辑 `lib/game/cardChecker.ts`
   - 实现牌型检测逻辑
   - 添加比较规则

2. **修改UI组件**
   - 组件位于 `components/` 目录
   - 使用Tailwind CSS样式
   - 遵循React最佳实践

3. **扩展Socket事件**
   - 编辑 `lib/constants.ts` 添加事件名
   - 在 `lib/socket/server.ts` 实现服务端逻辑
   - 在客户端使用 `useSocket` Hook处理事件

### 代码规范

- 使用TypeScript类型注解
- 遵循ESLint规则
- 组件使用函数式写法
- 使用React Hooks管理状态
- 适当的错误处理

### 测试

```bash
# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage
```

## 配置说明

### 环境变量

创建 `.env.local` 文件:

```env
# Socket.io配置
NODE_ENV=development
PORT=3000
SOCKET_PORT=3001

# 允许的跨域来源（生产环境）
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Tailwind配置

编辑 `tailwind.config.ts` 自定义样式:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
```

## 常见问题

### 1. Socket连接失败

**问题**: 显示"未连接"状态

**解决方案**:
- 检查防火墙设置
- 确认端口3000未被占用
- 检查浏览器控制台错误信息

### 2. 手牌不显示

**问题**: 游戏开始后看不到手牌

**解决方案**:
- 确认4个玩家都已准备
- 重新开始游戏
- 检查浏览器控制台是否有错误

### 3. 出牌失败

**问题**: 点击出牌没有反应

**解决方案**:
- 确认是否轮到你出牌
- 检查选中的牌是否符合规则
- 尝试刷新页面重新连接

## 性能优化

### 已实现的优化

- React组件懒加载
- Socket.io连接池管理
- 虚拟滚动（大列表）
- 防抖和节流处理

### 未来优化计划

- [ ] Web Workers处理复杂计算
- [ ] IndexedDB缓存游戏数据
- [ ] PWA支持
- [ ] 离线模式

## 贡献指南

欢迎提交Issue和Pull Request！

### 提交Issue

请在 [GitHub Issues](https://github.com/your-repo/issues) 提交问题，包含:
- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 截图（如有）

### 提交PR

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 测试状态

当前版本: v1.0.0

测试覆盖:
- ✅ 单元测试: 游戏逻辑
- ✅ 集成测试: Socket通信
- ⏳ E2E测试: 多玩家流程
- ⏳ 性能测试: 并发连接

详细测试报告: [TESTING.md](TESTING.md)

## 已知问题

查看 [BUGS.md](BUGS.md) 获取已知问题和改进建议。

## 许可证

本项目采用 MIT 许可证。

## 联系方式

- 项目主页: [GitHub Repository](https://github.com/your-repo)
- 问题反馈: [GitHub Issues](https://github.com/your-repo/issues)
- 邮箱: your-email@example.com

## 致谢

- [Next.js](https://nextjs.org/) - React框架
- [Socket.io](https://socket.io/) - 实时通信
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [TypeScript](https://www.typescriptlang.org/) - 类型系统

## 更新日志

### v1.0.0 (2026-02-26)
- ✅ 实现基础游戏框架
- ✅ 完成手牌UI
- ✅ 集成Socket.io
- ✅ 实现核心游戏逻辑
- ✅ 添加测试文档

### 未来计划
- [ ] 进贡阶段实现
- [ ] 游戏结算优化
- [ ] 移动端适配
- [ ] 音效和动画
- [ ] 数据持久化
- [ ] 排行榜系统

---

**享受游戏！Good luck and have fun! 🎴**
