"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle, CheckCircle } from "lucide-react"
import { useExchanges } from "@/hooks/use-exchanges"

export default function ConfigPage() {
  const { exchanges, loading, error, reload } = useExchanges()
  const [configPath, setConfigPath] = useState<string>("")

  useEffect(() => {
    // 获取配置文件路径
    fetch('/api/config/path')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setConfigPath(data.data.path)
        }
      })
      .catch(err => console.error('获取配置路径失败:', err))
  }, [])

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">系统配置</h1>
          <p className="text-muted-foreground">查看和管理系统配置信息</p>
        </div>
        <Button onClick={reload} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '刷新中...' : '刷新配置'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* 交易所配置卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              交易所配置
              {error ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-success" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">配置文件路径</label>
              <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                {configPath || '/path/to/config.yaml'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                可用交易所 ({exchanges.length})
              </label>
              {loading ? (
                <div className="flex items-center gap-2 mt-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">加载中...</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 mt-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{error}</span>
                  <Badge variant="secondary">已使用默认配置</Badge>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {exchanges.map((exchange, index) => (
                    <Badge key={exchange} variant={index === 0 ? "default" : "secondary"}>
                      {exchange}
                      {index === 0 && <span className="ml-1 text-xs">(默认)</span>}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground mt-4 space-y-1">
              <p>• 交易所配置从 config.yaml 文件的 EXCHANGES 字段加载</p>
              <p>• 修改配置文件后，点击"刷新配置"按钮重新加载</p>
              <p>• 如果配置文件不存在或加载失败，系统将使用默认配置</p>
            </div>
          </CardContent>
        </Card>

        {/* 配置示例卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>配置文件示例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <label className="text-sm font-medium text-muted-foreground">config.yaml 内容示例：</label>
              <pre className="bg-muted p-4 rounded mt-2 overflow-x-auto">
{`EXCHANGES:
  - Binance
  - OKX
  - Bybit
  - Bitget
  - Coinbase
  - Kraken`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}