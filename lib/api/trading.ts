// API客户端 - 交易功能

export interface ManualOrderRequest {
  templateId: string
  accountId: string
  controlType: 'active' | 'passive'
  orderType: 'GTC LIMIT' | 'IOC LIMIT' | 'MARKET'
  symbol: string
  side: 'buy' | 'sell'
  amount: number
  price?: number
  level?: string
}

export interface TimedTaskRequest {
  templateId: string
  controlType: 'active' | 'passive'
  action: 'start' | 'stop'
  config?: {
    maxTradeAmount?: number
    amountType?: 'USDT' | 'TOKEN'
    minSize?: number
    maxSize?: number
    buySell?: 'buy' | 'sell'
    orderType?: 'GTC LIMIT' | 'IOC LIMIT' | 'MARKET'
    minTime?: number
    maxTime?: number
    isRunning?: boolean
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class TradingAPI {
  private baseUrl = '/api/trading'

  async placeManualOrder(orderData: ManualOrderRequest): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/manual-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })
      return await response.json()
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async manageTimedTask(taskData: TimedTaskRequest): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/timed-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })
      return await response.json()
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async updateTimedTaskConfig(configData: {
    templateId: string
    controlType: 'active' | 'passive'
    config: any
  }): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/timed-task`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      })
      return await response.json()
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // 开启定时任务
  async startTimedTask(
    templateId: string, 
    controlType: 'active' | 'passive', 
    config?: any
  ): Promise<ApiResponse<any>> {
    return this.manageTimedTask({
      templateId,
      controlType,
      action: 'start',
      config
    })
  }

  // 停止定时任务
  async stopTimedTask(
    templateId: string, 
    controlType: 'active' | 'passive'
  ): Promise<ApiResponse<any>> {
    return this.manageTimedTask({
      templateId,
      controlType,
      action: 'stop'
    })
  }
}

export const tradingAPI = new TradingAPI()