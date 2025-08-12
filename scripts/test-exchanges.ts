#!/usr/bin/env tsx

/**
 * 交易所连接测试脚本
 * 用于测试所有交易所的连接和基本功能
 */

import { exchangeManager, ExchangeManager, getSupportedExchanges } from '../lib/exchanges'

// 测试配置（使用环境变量或测试密钥）
const TEST_CONFIGS = {
  binance: {
    apiKey: process.env.BINANCE_API_KEY || 'test-key',
    apiSecret: process.env.BINANCE_API_SECRET || 'test-secret',
    sandbox: true
  },
  bybit: {
    apiKey: process.env.BYBIT_API_KEY || 'test-key',
    apiSecret: process.env.BYBIT_API_SECRET || 'test-secret',
    sandbox: true
  },
  bitget: {
    apiKey: process.env.BITGET_API_KEY || 'test-key',
    apiSecret: process.env.BITGET_API_SECRET || 'test-secret',
    passphrase: process.env.BITGET_PASSPHRASE || '',
    sandbox: true
  },
  okx: {
    apiKey: process.env.OKX_API_KEY || 'test-key',
    apiSecret: process.env.OKX_API_SECRET || 'test-secret',
    passphrase: process.env.OKX_PASSPHRASE || 'test-passphrase',
    sandbox: true
  }
}

class ExchangeTestRunner {
  private manager: ExchangeManager
  private testResults: Map<string, any> = new Map()

  constructor() {
    this.manager = exchangeManager
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.manager.on('exchangeConnected', ({ name }) => {
      console.log(`✅ ${name.toUpperCase()} 连接成功`)
    })

    this.manager.on('exchangeError', ({ name, error }) => {
      console.error(`❌ ${name.toUpperCase()} 连接失败:`, error.message)
    })

    this.manager.on('exchangeWebSocketConnected', ({ name }) => {
      console.log(`🔌 ${name.toUpperCase()} WebSocket 连接成功`)
    })

    this.manager.on('websocketData', ({ exchange, type, data }) => {
      console.log(`📡 ${exchange.toUpperCase()} ${type} 数据:`, JSON.stringify(data).substring(0, 100) + '...')
    })
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 开始测试所有交易所连接...\n')

    const supportedExchanges = getSupportedExchanges()
    console.log(`📋 支持的交易所: ${supportedExchanges.join(', ')}\n`)

    // 测试基础连接
    await this.testBasicConnections()

    // 测试API功能
    await this.testApiFunctions()

    // 测试WebSocket功能
    await this.testWebSocketFunctions()

    // 输出测试结果
    this.printTestResults()

    // 清理资源
    await this.cleanup()
  }

  private async testBasicConnections(): Promise<void> {
    console.log('📡 测试基础连接...')

    for (const [exchangeName, config] of Object.entries(TEST_CONFIGS)) {
      try {
        console.log(`\n🔄 测试 ${exchangeName.toUpperCase()} 连接...`)
        
        await this.manager.addExchange(exchangeName, config, true)
        
        const exchange = this.manager.getExchange(exchangeName)
        const isConnected = exchange?.isConnected() ?? false
        
        this.testResults.set(`${exchangeName}_connection`, {
          success: isConnected,
          message: isConnected ? '连接成功' : '连接失败'
        })

        if (isConnected) {
          console.log(`✅ ${exchangeName.toUpperCase()} 基础连接测试通过`)
        }

      } catch (error) {
        console.error(`❌ ${exchangeName.toUpperCase()} 连接失败:`, error)
        this.testResults.set(`${exchangeName}_connection`, {
          success: false,
          message: error instanceof Error ? error.message : '未知错误'
        })
      }
    }
  }

  private async testApiFunctions(): Promise<void> {
    console.log('\n🔧 测试API功能...')

    const connectedExchanges = this.manager.getConnectedExchanges()
    
    for (const exchangeName of connectedExchanges) {
      console.log(`\n📊 测试 ${exchangeName.toUpperCase()} API功能...`)
      const exchange = this.manager.getExchange(exchangeName)
      
      if (!exchange) continue

      // 测试获取账户信息（可能会失败，因为是测试密钥）
      try {
        console.log(`  📋 测试获取账户信息...`)
        const account = await exchange.getFuturesAccount()
        console.log(`  ✅ 账户信息获取成功`)
        this.testResults.set(`${exchangeName}_account`, { success: true, data: account })
      } catch (error) {
        console.log(`  ⚠️ 账户信息获取失败 (预期情况，使用测试密钥)`)
        this.testResults.set(`${exchangeName}_account`, { 
          success: false, 
          message: '测试密钥无法获取真实账户信息' 
        })
      }

      // 测试获取行情数据（应该成功，不需要认证）
      try {
        console.log(`  📈 测试获取BTC/USDT行情...`)
        const ticker = await exchange.getFuturesTicker('BTC/USDT')
        console.log(`  ✅ 行情数据获取成功: $${ticker.last}`)
        this.testResults.set(`${exchangeName}_ticker`, { success: true, price: ticker.last })
      } catch (error) {
        console.log(`  ❌ 行情数据获取失败:`, error)
        this.testResults.set(`${exchangeName}_ticker`, { 
          success: false, 
          message: error instanceof Error ? error.message : '未知错误' 
        })
      }

      // 测试获取订单簿（应该成功，不需要认证）
      try {
        console.log(`  📊 测试获取订单簿...`)
        const orderbook = await exchange.getFuturesOrderBook('BTC/USDT', 5)
        console.log(`  ✅ 订单簿获取成功，买盘${orderbook.bids.length}档，卖盘${orderbook.asks.length}档`)
        this.testResults.set(`${exchangeName}_orderbook`, { success: true })
      } catch (error) {
        console.log(`  ❌ 订单簿获取失败:`, error)
        this.testResults.set(`${exchangeName}_orderbook`, { 
          success: false, 
          message: error instanceof Error ? error.message : '未知错误' 
        })
      }
    }
  }

  private async testWebSocketFunctions(): Promise<void> {
    console.log('\n🔌 测试WebSocket功能...')

    const connectedExchanges = this.manager.getConnectedExchanges()
    
    if (connectedExchanges.length === 0) {
      console.log('⚠️ 没有已连接的交易所，跳过WebSocket测试')
      return
    }

    console.log('📡 订阅BTC/USDT行情数据（10秒测试）...')

    let messageCount = 0
    const testDuration = 10000 // 10秒

    // 订阅行情数据
    this.manager.subscribeToAllExchanges('ticker', 'BTC/USDT', (exchangeName, data) => {
      messageCount++
      if (messageCount <= 5) { // 只显示前5条消息
        console.log(`📈 ${exchangeName.toUpperCase()}: $${data.data?.last || 'N/A'}`)
      }
    })

    // 等待测试时间
    await new Promise(resolve => setTimeout(resolve, testDuration))

    console.log(`✅ WebSocket测试完成，共接收${messageCount}条消息`)
    this.testResults.set('websocket_test', { 
      success: messageCount > 0, 
      messageCount 
    })
  }

  private printTestResults(): void {
    console.log('\n📊 测试结果汇总:')
    console.log('=' .repeat(60))

    let totalTests = 0
    let passedTests = 0

    for (const [testName, result] of this.testResults.entries()) {
      totalTests++
      const status = result.success ? '✅ 通过' : '❌ 失败'
      const message = result.message || result.data?.balance !== undefined ? 
        `余额: ${result.data.balance}` : ''
      
      console.log(`${testName.padEnd(25)}: ${status} ${message}`)
      
      if (result.success) passedTests++
    }

    console.log('=' .repeat(60))
    console.log(`总测试数: ${totalTests}, 通过: ${passedTests}, 失败: ${totalTests - passedTests}`)
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

    // 连接状态汇总
    const healthStatuses = this.manager.getAllExchangeStatuses()
    console.log('\n🏥 交易所健康状态:')
    healthStatuses.forEach(status => {
      const connectionStatus = status.connected ? '🟢' : '🔴'
      const wsStatus = status.wsConnected ? '🟢' : '🔴'
      console.log(`${status.name.toUpperCase().padEnd(10)}: 连接${connectionStatus} WebSocket${wsStatus}`)
    })
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 清理测试资源...')
    await this.manager.cleanup()
    console.log('✅ 清理完成')
  }
}

// 运行测试
async function main(): Promise<void> {
  const runner = new ExchangeTestRunner()
  
  try {
    await runner.runAllTests()
  } catch (error) {
    console.error('❌ 测试运行失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('💥 程序异常退出:', error)
    process.exit(1)
  })
}

export { ExchangeTestRunner }