# ToTheMoon Dashboard - 加密货币交易管理平台

一个基于 Next.js 15 的综合性加密货币交易管理平台，支持多个交易所的模板管理、自动交易和实时监控。

## 🚀 功能特性

### 核心功能
- **模板管理**: 创建和管理交易模板，支持主动控制和被动控制
- **多交易所支持**: 集成 Binance、Bybit、Bitget、OKX 四大交易所
- **实时交易**: 手动下单和自动定时任务
- **账户管理**: 多账户配置和执行模式选择
- **数据持久化**: 基于 MongoDB 的完整数据存储

### 交易功能
- **手动下单**: 支持 GTC LIMIT、IOC LIMIT、MARKET 订单类型
- **定时任务**: 可配置的自动交易任务
- **最大持仓控制**: 支持 USDT 和 TOKEN 两种持仓量控制方式
- **订单管理**: 实时订单状态跟踪和历史记录
- **风险控制**: 账户执行模式和交易限制

### 技术特性
- **WebSocket 实时数据**: 实时价格、订单薄、交易数据订阅
- **RESTful API**: 完整的交易和账户管理接口
- **响应式设计**: 支持桌面和移动端
- **深色/浅色主题**: 用户界面主题切换

## 🛠 技术栈

### 前端
- **Next.js 15** - React 全栈框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI 组件库
- **Lucide React** - 图标库

### 后端
- **Node.js** - 运行时环境
- **MongoDB** - 数据库
- **REST API** - 接口设计

### 交易所集成
- **Binance API** - 币安交易所
- **Bybit API** - Bybit 交易所
- **Bitget API** - Bitget 交易所
- **OKX API** - OKX 交易所

## 📦 安装部署

### 1. 克隆项目
```bash
git clone <repository-url>
cd to_the_moon
```

### 2. 安装依赖
```bash
npm install --legacy-peer-deps
```

### 3. 环境配置
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下内容：
```env
# MongoDB配置
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=to_the_moon

# 交易所API配置 (可选，用于测试)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key
# ... 其他交易所配置
```

### 4. 数据库初始化
```bash
npm run init-db
```

### 5. 启动开发服务器
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🔧 开发命令

```bash
# 开发环境
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint

# 数据库初始化
npm run init-db

# 测试交易所连接
npm run test-exchanges
```

## 📁 项目结构

```
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── templates/            # 模板管理 API
│   │   └── trading/              # 交易功能 API
│   ├── control-center/           # 控制中心页面
│   ├── template-management/      # 模板管理页面
│   ├── layout.tsx               # 根布局
│   └── page.tsx                 # 首页
├── components/                   # React 组件
│   ├── ui/                      # shadcn/ui 组件
│   ├── header.tsx               # 头部组件
│   ├── template-dialog.tsx      # 模板对话框
│   └── theme-provider.tsx       # 主题提供者
├── lib/                         # 业务逻辑
│   ├── api/                     # API 客户端
│   ├── database.ts              # 数据库连接
│   ├── exchanges/               # 交易所连接器
│   ├── repositories/            # 数据访问层
│   ├── services/                # 业务服务层
│   └── utils.ts                 # 工具函数
├── types/                       # TypeScript 类型定义
│   ├── database.ts              # 数据库类型
│   └── exchange.ts              # 交易所类型
├── scripts/                     # 辅助脚本
│   ├── init-db.ts              # 数据库初始化
│   └── test-exchanges.ts        # 交易所测试
└── styles/                      # 样式文件
```

## 🔗 API 接口

### 模板管理
- `GET /api/templates` - 获取所有模板
- `POST /api/templates` - 创建新模板
- `GET /api/templates/[id]` - 获取单个模板
- `PUT /api/templates/[id]` - 更新模板
- `DELETE /api/templates/[id]` - 删除模板

### 交易功能
- `POST /api/trading/manual-order` - 手动下单
- `POST /api/trading/timed-task` - 管理定时任务
- `PUT /api/trading/timed-task` - 更新定时任务配置

## 🏗 架构设计

### 数据库层
- **BaseRepository**: 通用数据访问基类
- **TemplateRepository**: 模板数据操作
- **AccountRepository**: 账户数据操作
- **OrderRepository**: 订单数据操作

### 业务服务层
- **TemplateService**: 模板业务逻辑
- **TradingService**: 交易业务逻辑

### 交易所集成层
- **BaseExchange**: 交易所连接器基类
- **BinanceExchange**: Binance 连接器
- **BybitExchange**: Bybit 连接器
- **BitgetExchange**: Bitget 连接器
- **OKXExchange**: OKX 连接器
- **ExchangeFactory**: 交易所工厂
- **ExchangeManager**: 交易所管理器

## 🔐 安全注意事项

1. **API 密钥安全**
   - 永远不要在代码中硬编码 API 密钥
   - 使用环境变量存储敏感信息
   - 定期轮换 API 密钥

2. **网络安全**
   - 生产环境使用 HTTPS
   - 配置防火墙限制数据库访问
   - 使用 IP 白名单限制 API 访问

3. **数据安全**
   - 敏感数据加密存储
   - 定期备份数据库
   - 监控异常访问行为

## 🚨 风险声明

⚠️ **重要提醒**: 本项目仅供学习和研究使用。加密货币交易存在高风险，可能导致资金损失。使用本软件进行实际交易前，请：

1. 充分了解加密货币交易风险
2. 在测试环境中充分验证
3. 从小额资金开始测试
4. 建立完善的风险控制机制
5. 遵守当地法律法规

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请通过以下方式获取支持：
- 提交 GitHub Issue
- 查看项目文档
- 参考 API 文档