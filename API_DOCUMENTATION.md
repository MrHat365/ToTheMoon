# 控制中心 API 接口文档

为控制中心页面功能设计的API接口，提供手动下单、定时任务管理和订单历史查询功能。

## 目录

1. [手动下单API](#手动下单api)
2. [定时任务API](#定时任务api)
3. [订单历史API](#订单历史api)
4. [数据结构定义](#数据结构定义)

---

## 手动下单API

### POST /api/trading/manual-order
**功能**: 执行手动下单操作，支持多账户批量下单

**请求体**:
```json
{
  "templateId": "template_btc_usdt_strategy",
  "controlType": "active",
  "orderType": "GTC_LIMIT",
  "symbol": "BTC/USDT",
  "side": "buy",
  "size": 0.1,
  "price": 42000.00,
  "orderBookLevel": 1,
  "selectedAccountIds": ["acc_binance_main", "acc_binance_sub"]
}
```

**响应**:
```json
{
  "success": true,
  "message": "手动下单执行完成，成功 2/2 个订单",
  "data": {
    "batchId": "batch_1754933666879_7a4qtxyfe",
    "results": [
      {
        "orderId": "order_1754933666879_0_uelbh0p6e",
        "accountId": "acc_binance_main",
        "accountName": "Account-e_main",
        "status": "success",
        "exchangeOrderId": "EXG_1GR8CD9IF2Y",
        "executedPrice": 42037.261259,
        "executedQuantity": 0.1,
        "timestamp": "2025-08-11T17:34:26.879Z"
      }
    ],
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0,
      "pending": 0
    }
  }
}
```

### GET /api/trading/manual-order
**功能**: 查询手动下单历史

**查询参数**:
- `templateId` (可选): 模板ID
- `controlType` (可选): `active` | `passive`
- `limit` (可选): 每页数量，默认50
- `page` (可选): 页码，默认1

**响应**: 返回分页的订单历史记录

---

## 定时任务API

### POST /api/trading/timed-task
**功能**: 启动或停止定时任务

**启动任务请求**:
```json
{
  "templateId": "template_btc_usdt_strategy",
  "controlType": "active",
  "action": "start",
  "config": {
    "minSize": 0.05,
    "maxSize": 0.5,
    "minTime": 10,
    "maxTime": 60,
    "tradeSide": "buy",
    "orderType": "GTC_LIMIT",
    "orderBookLevel": 1,
    "eatLimit": 0,
    "maxTradeAmount": 1000,
    "amountType": "USDT",
    "selectedAccountIds": ["acc_binance_main"]
  }
}
```

**停止任务请求**:
```json
{
  "templateId": "template_btc_usdt_strategy",
  "controlType": "active",
  "action": "stop"
}
```

**响应**:
```json
{
  "success": true,
  "message": "定时任务已启动 (主动控制)",
  "data": {
    "taskId": "task_1754933680986_6clxwpdz7",
    "templateId": "template_btc_usdt_strategy",
    "controlType": "active",
    "isRunning": true,
    "config": { ... },
    "statistics": {
      "totalOrders": 0,
      "successfulOrders": 0,
      "failedOrders": 0,
      "totalVolume": 0,
      "averagePrice": 0,
      "runningTime": 0
    },
    "startTime": "2025-08-11T17:34:40.986Z",
    "nextExecutionTime": "2025-08-11T17:35:10.279Z"
  }
}
```

### GET /api/trading/timed-task
**功能**: 查询定时任务状态

**查询参数**:
- `templateId` (必需): 模板ID
- `controlType` (必需): `active` | `passive`

**响应**: 返回当前定时任务状态和统计信息

### PUT /api/trading/timed-task
**功能**: 更新定时任务配置（仅在任务停止时可用）

**请求体**: 包含新的配置参数

---

## 订单历史API

### GET /api/trading/order-history
**功能**: 查询订单历史记录

**查询参数**:
- `templateId` (可选): 模板ID
- `controlType` (可选): `active` | `passive`
- `orderType` (可选): `manual` | `timed`
- `status` (可选): `success` | `failed` | `pending` | `cancelled`
- `symbol` (可选): 交易对
- `startDate` (可选): 开始日期
- `endDate` (可选): 结束日期
- `limit` (可选): 每页数量，默认50
- `page` (可选): 页码，默认1

**响应**:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_1754933692010_rip98jayz",
        "templateId": "template_btc_usdt_strategy",
        "templateName": "Trading Template 1",
        "controlType": "passive",
        "exchange": "OKX",
        "accountId": "acc_okx_mhnxqk",
        "accountName": "OKX Account 4",
        "orderType": "timed",
        "tradeType": "IOC_LIMIT",
        "symbol": "ADA/USDT",
        "side": "buy",
        "size": 8.5172,
        "price": 294.544244,
        "status": "failed",
        "errorMessage": "余额不足",
        "orderBookLevel": 5,
        "createdAt": "2025-08-11T17:34:52.010Z",
        "updatedAt": "2025-08-11T17:35:05.889Z"
      }
    ],
    "statistics": {
      "total": 100,
      "successful": 24,
      "failed": 26,
      "pending": 29,
      "cancelled": 21,
      "totalVolume": 119.66,
      "averagePrice": 11536.94,
      "exchanges": {
        "Binance": 33,
        "Bybit": 28,
        "OKX": 19,
        "Bitget": 20
      },
      "symbols": {
        "BTC/USDT": 22,
        "ETH/USDT": 19,
        "ADA/USDT": 25,
        "SOL/USDT": 17,
        "BNB/USDT": 17
      }
    },
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 100,
      "totalPages": 20
    }
  }
}
```

### DELETE /api/trading/order-history
**功能**: 清除订单历史记录

**查询参数**:
- `templateId` (可选): 特定模板的记录
- `olderThan` (可选): 清除多少天前的记录

---

## 数据结构定义

### ManualOrderRequest
```typescript
interface ManualOrderRequest {
  templateId: string
  controlType: 'active' | 'passive'
  orderType: 'GTC_LIMIT' | 'IOC_LIMIT' | 'MARKET'
  symbol: string
  side: 'buy' | 'sell'
  size: number
  price?: number // 被动控制需要价格
  orderBookLevel: number
  selectedAccountIds: string[]
}
```

### TimedTaskConfig
```typescript
interface TimedTaskConfig {
  minSize: number
  maxSize: number
  minTime: number // 秒
  maxTime: number // 秒
  tradeSide: 'buy' | 'sell'
  orderType: 'GTC_LIMIT' | 'IOC_LIMIT' | 'MARKET'
  orderBookLevel: number
  eatLimit?: number // 主动控制特有
  maxTradeAmount: number
  amountType: 'USDT' | 'TOKEN'
  selectedAccountIds: string[]
}
```

### OrderExecutionResult
```typescript
interface OrderExecutionResult {
  orderId: string
  accountId: string
  accountName: string
  status: 'success' | 'failed' | 'pending'
  exchangeOrderId?: string
  executedPrice?: number
  executedQuantity?: number
  errorMessage?: string
  timestamp: string
}
```

### TimedTaskStatus
```typescript
interface TimedTaskStatus {
  taskId: string
  templateId: string
  controlType: 'active' | 'passive'
  isRunning: boolean
  config: TimedTaskConfig
  statistics: {
    totalOrders: number
    successfulOrders: number
    failedOrders: number
    totalVolume: number
    averagePrice: number
    runningTime: number // 运行时间（秒）
  }
  startTime?: string
  lastExecutionTime?: string
  nextExecutionTime?: string
}
```

## 特性说明

### 虚拟数据生成
- 所有API返回逼真的虚拟数据
- 90%成功率的模拟订单执行
- 动态生成的订单ID、交易所订单ID等
- 真实的价格波动和交易统计

### 错误处理
- 完整的参数验证
- 合适的HTTP状态码
- 中文错误消息
- 详细的错误信息

### 状态管理
- 定时任务状态在内存中管理
- 支持任务状态查询和更新
- 防重复启动检查
- 任务运行时间统计

### 分页和筛选
- 订单历史支持多维度筛选
- 分页查询支持
- 统计信息汇总
- 性能优化的数据结构

## 使用示例

### curl测试示例

```bash
# 手动下单
curl -X POST http://localhost:3000/api/trading/manual-order \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "template_btc_usdt_strategy",
    "controlType": "active",
    "orderType": "GTC_LIMIT",
    "symbol": "BTC/USDT",
    "side": "buy",
    "size": 0.1,
    "orderBookLevel": 1,
    "selectedAccountIds": ["acc_binance_main"]
  }'

# 启动定时任务
curl -X POST http://localhost:3000/api/trading/timed-task \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "template_test",
    "controlType": "active",
    "action": "start",
    "config": {
      "minSize": 0.05,
      "maxSize": 0.5,
      "minTime": 10,
      "maxTime": 60,
      "tradeSide": "buy",
      "orderType": "GTC_LIMIT",
      "orderBookLevel": 1,
      "maxTradeAmount": 1000,
      "amountType": "USDT",
      "selectedAccountIds": ["acc_test"]
    }
  }'

# 查询订单历史
curl "http://localhost:3000/api/trading/order-history?templateId=template_btc_usdt_strategy&limit=10"
```

---

这套API接口完全支持控制中心页面的所有功能需求，提供了完整的手动下单、定时任务管理和历史记录查询功能。