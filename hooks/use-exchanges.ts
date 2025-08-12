import { useState, useEffect } from 'react'

/**
 * 交易所配置Hook
 * 从API获取可用的交易所列表
 */
export function useExchanges() {
  const [exchanges, setExchanges] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadExchanges = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/config/exchanges')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setExchanges(result.data.exchanges)
      } else {
        throw new Error(result.error || '获取交易所配置失败')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError(errorMessage)
      console.error('加载交易所配置失败:', err)
      
      // 使用默认配置作为降级方案
      setExchanges(['Binance', 'Coinbase', 'Kraken'])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExchanges()
  }, [])

  return {
    exchanges,
    loading,
    error,
    reload: loadExchanges
  }
}