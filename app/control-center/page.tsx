"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useSearchParams } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Account {
  id: string
  name: string
  apiKey: string
  secretKey: string
  passphrase: string
}

interface ControlConfig {
  exchange: string
  accounts: Account[]
  executionMode: "loop" | "random"
}

interface Template {
  id: string
  name: string
  activeControl: ControlConfig
  passiveControl: ControlConfig
}


// Helper function to get badge color based on exchange - now using neutral secondary colors
const getExchangeBadgeColor = (exchange: string) => {
  // Using shadcn's secondary colors for neutral badge look
  return "bg-secondary text-secondary-foreground"
}

export default function ControlCenterPage() {
  const searchParams = useSearchParams()
  const initialTemplateId = searchParams.get("templateId")
  const { toast } = useToast()

  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId || "")
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)
  const [activeSymbol, setActiveSymbol] = useState("BTC/USDT")
  const [passiveSymbol, setPassiveSymbol] = useState("BTC/USDT")
  const [symbolSyncing, setSymbolSyncing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取所有模板
  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/templates')
      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.data)
        
        // 如果URL中有templateId，使用该模板；否则使用第一个模板
        const templateToSelect = initialTemplateId 
          ? data.data.find((t: Template) => t.id === initialTemplateId) 
          : data.data[0]
        
        if (templateToSelect) {
          setSelectedTemplateId(templateToSelect.id)
          setCurrentTemplate(templateToSelect)
        }
        
        setError(null)
      } else {
        setError(data.error || '获取模板失败')
      }
    } catch (error) {
      console.error('获取模板失败:', error)
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // Control settings (from template)
  const [activeExecutionMode, setActiveExecutionMode] = useState<"loop" | "random">("loop")
  const [passiveExecutionMode, setPassiveExecutionMode] = useState<"loop" | "random">("loop")

  const [selectedActiveAccounts, setSelectedActiveAccounts] = useState<string[]>([])
  const [selectedPassiveAccounts, setSelectedPassiveAccounts] = useState<string[]>([])

  // Collapsible states for account lists
  const [isAccountsActiveOpen, setIsAccountsActiveOpen] = useState(true)
  const [isAccountsPassiveOpen, setIsAccountsPassiveOpen] = useState(true)

  // Active Control - Manual Order Placement states
  const [activeGtcLimitSize, setActiveGtcLimitSize] = useState(0.1)
  const [activeGtcLimitBuySell, setActiveGtcLimitBuySell] = useState<"buy" | "sell">("buy")
  const [activeGtcLimitLevel, setActiveGtcLimitLevel] = useState("1")

  const [activeIocLimitSize, setActiveIocLimitSize] = useState(0.1)
  const [activeIocLimitBuySell, setActiveIocLimitBuySell] = useState<"buy" | "sell">("buy")
  const [activeIocLimitLevel, setActiveIocLimitLevel] = useState("1")

  const [activeMarketSize, setActiveMarketSize] = useState(0.1)
  const [activeMarketBuySell, setActiveMarketBuySell] = useState<"buy" | "sell">("buy")
  const [activeMarketLevel, setActiveMarketLevel] = useState("1")

  // Active Control - Timed Task states
  const [activeTimedTaskMinSize, setActiveTimedTaskMinSize] = useState(0.05)
  const [activeTimedTaskMaxSize, setActiveTimedTaskMaxSize] = useState(0.5)
  const [activeTimedTaskBuySell, setActiveTimedTaskBuySell] = useState<"buy" | "sell">("buy")
  const [activeTimedTaskOrderBookLevel, setActiveTimedTaskOrderBookLevel] = useState("1")
  const [activeTimedTaskOrderType, setActiveTimedTaskOrderType] = useState<"GTC LIMIT" | "IOC LIMIT" | "MARKET">(
    "GTC LIMIT",
  )
  const [activeTimedTaskEatLimit, setActiveTimedTaskEatLimit] = useState(0)
  const [activeTimedTaskMinTime, setActiveTimedTaskMinTime] = useState(10) // New: min time in seconds
  const [activeTimedTaskMaxTime, setActiveTimedTaskMaxTime] = useState(60) // New: max time in seconds
  const [activeTimedTaskMaxTradeAmount, setActiveTimedTaskMaxTradeAmount] = useState(1000) // New: max trade amount
  const [activeTimedTaskAmountType, setActiveTimedTaskAmountType] = useState<"USDT" | "TOKEN">("USDT") // New: amount type
  const [isActiveTimedTaskRunning, setIsActiveTimedTaskRunning] = useState(false)

  // Passive Control - Manual Order Placement states
  const [passiveGtcLimitSize, setPassiveGtcLimitSize] = useState(0.1)
  const [passiveGtcLimitBuySell, setPassiveGtcLimitBuySell] = useState<"buy" | "sell">("buy")
  const [passiveGtcLimitLevel, setPassiveGtcLimitLevel] = useState("1")
  const [passiveGtcLimitPrice, setPassiveGtcLimitPrice] = useState(0)

  const [passiveIocLimitSize, setPassiveIocLimitSize] = useState(0.1)
  const [passiveIocLimitBuySell, setPassiveIocLimitBuySell] = useState<"buy" | "sell">("buy")
  const [passiveIocLimitLevel, setPassiveIocLimitLevel] = useState("1")
  const [passiveIocLimitPrice, setPassiveIocLimitPrice] = useState(0)

  const [passiveMarketSize, setPassiveMarketSize] = useState(0.1)
  const [passiveMarketBuySell, setPassiveMarketBuySell] = useState<"buy" | "sell">("buy")
  const [passiveMarketLevel, setPassiveMarketLevel] = useState("1")
  const [passiveMarketPrice, setPassiveMarketPrice] = useState(0)

  // Passive Control - Timed Task states
  const [passiveTimedTaskMinSize, setPassiveTimedTaskMinSize] = useState(0.05)
  const [passiveTimedTaskMaxSize, setPassiveTimedTaskMaxSize] = useState(0.5)
  const [passiveTimedTaskBuySell, setPassiveTimedTaskBuySell] = useState<"buy" | "sell">("buy")
  const [passiveTimedTaskOrderType, setPassiveTimedTaskOrderType] = useState<"GTC LIMIT" | "IOC LIMIT" | "MARKET">(
    "GTC LIMIT",
  )
  const [passiveTimedTaskMinTime, setPassiveTimedTaskMinTime] = useState(10) // New: min time in seconds
  const [passiveTimedTaskMaxTime, setPassiveTimedTaskMaxTime] = useState(60) // New: max time in seconds
  const [passiveTimedTaskMaxTradeAmount, setPassiveTimedTaskMaxTradeAmount] = useState(1000) // New: max trade amount
  const [passiveTimedTaskAmountType, setPassiveTimedTaskAmountType] = useState<"USDT" | "TOKEN">("USDT") // New: amount type
  const [isPassiveTimedTaskRunning, setIsPassiveTimedTaskRunning] = useState(false)

  // 强制清理所有任务
  const forceCleanAllTasks = async () => {
    try {
      const response = await fetch('/api/trading/timed-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'force-clean',
          taskType: 'active',
          templateId: 'cleanup'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setIsActiveTimedTaskRunning(false)
        setIsPassiveTimedTaskRunning(false)
        toast({
          title: "清理成功",
          description: "所有定时任务已强制清理完成！",
          variant: "success",
        })
      } else {
        toast({
          title: "清理失败",
          description: "强制清理任务失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("强制清理失败:", error)
      toast({
        title: "清理失败",
        description: "强制清理任务时发生错误",
        variant: "destructive",
      })
    }
  }

  // 检查定时任务状态
  const checkTaskStatus = async (templateId: string) => {
    if (!templateId) return

    try {
      // 检查主动控制任务状态
      const activeResponse = await fetch('/api/trading/timed-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'status',
          taskType: 'active',
          templateId
        })
      })
      const activeData = await activeResponse.json()
      if (activeData.success && activeData.data.status) {
        setIsActiveTimedTaskRunning(activeData.data.status.isRunning)
      }

      // 检查被动控制任务状态
      const passiveResponse = await fetch('/api/trading/timed-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'status',
          taskType: 'passive',
          templateId
        })
      })
      const passiveData = await passiveResponse.json()
      if (passiveData.success && passiveData.data.status) {
        setIsPassiveTimedTaskRunning(passiveData.data.status.isRunning)
      }
    } catch (error) {
      console.error('检查任务状态失败:', error)
    }
  }

  // 页面加载时获取数据
  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    const template = templates.find((t) => t.id === selectedTemplateId)
    setCurrentTemplate(template || null)
    if (template) {
      setSelectedActiveAccounts(template.activeControl.accounts.map((acc) => acc.id))
      setSelectedPassiveAccounts(template.passiveControl.accounts.map((acc) => acc.id))
      setActiveExecutionMode(template.activeControl.executionMode) // Set initial execution mode
      setPassiveExecutionMode(template.passiveControl.executionMode) // Set initial execution mode
      // 检查定时任务状态
      checkTaskStatus(template.id)
    } else {
      setSelectedActiveAccounts([])
      setSelectedPassiveAccounts([])
      setActiveExecutionMode("loop") // Default if no template
      setPassiveExecutionMode("loop") // Default if no template
      setIsActiveTimedTaskRunning(false)
      setIsPassiveTimedTaskRunning(false)
    }
  }, [selectedTemplateId, templates])

  // Removed ethereum detection to prevent hydration mismatch

  const handleActiveAccountSelect = (accountId: string, checked: boolean) => {
    setSelectedActiveAccounts((prev) => (checked ? [...prev, accountId] : prev.filter((id) => id !== accountId)))
  }

  const handlePassiveAccountSelect = (accountId: string, checked: boolean) => {
    setSelectedPassiveAccounts((prev) => (checked ? [...prev, accountId] : prev.filter((id) => id !== accountId)))
  }

  const handlePlaceActiveOrder = (orderType: string, size: number, buySell: string, level: string) => {
    console.log(`主动控制 - 手动下单 (${orderType}):`, {
      template: currentTemplate?.name,
      activeSymbol,
      orderType,
      size,
      buySell,
      level,
      accounts: selectedActiveAccounts,
    })
    toast({
      title: "下单成功",
      description: `主动控制 - 手动下单 (${orderType}) 成功！请查看控制台日志。`,
      variant: "default",
    })
  }

  const handlePlacePassiveOrder = (orderType: string, size: number, buySell: string, level: string, price?: number) => {
    console.log(`被动控制 - 手动下单 (${orderType}):`, {
      template: currentTemplate?.name,
      passiveSymbol,
      orderType,
      size,
      buySell,
      level,
      price, // Include price for passive orders
      accounts: selectedPassiveAccounts,
    })
    toast({
      title: "下单成功",
      description: `被动控制 - 手动下单 (${orderType}) 成功！请查看控制台日志。`,
      variant: "default",
    })
  }

  const handleActiveTimedTaskStart = async () => {
    if (!currentTemplate) {
      toast({
        title: "操作失败",
        description: "请先选择控制模板",
        variant: "destructive",
      })
      return
    }

    if (!activeSymbol.trim()) {
      toast({
        title: "操作失败",
        description: "请输入主控所Symbol",
        variant: "destructive",
      })
      return
    }

    if (selectedActiveAccounts.length === 0) {
      toast({
        title: "操作失败",
        description: "请选择至少一个主动控制账户",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/trading/timed-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          taskType: 'active',
          templateId: currentTemplate.id,
          config: {
            minTimeSeconds: activeTimedTaskMinTime,
            maxTimeSeconds: activeTimedTaskMaxTime,
            minSize: activeTimedTaskMinSize,
            maxSize: activeTimedTaskMaxSize,
            buySell: activeTimedTaskBuySell,
            orderType: activeTimedTaskOrderType,
            symbol: activeSymbol,
            accounts: selectedActiveAccounts,
            orderBookLevel: activeTimedTaskOrderBookLevel,
            eatLimit: activeTimedTaskEatLimit,
            maxTradeAmount: activeTimedTaskMaxTradeAmount,
            amountType: activeTimedTaskAmountType,
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setIsActiveTimedTaskRunning(true)
        console.log("主动控制 - 定时任务开启:", data)
        toast({
          title: "任务启动成功",
          description: "主动控制定时任务已开启！",
          variant: "success",
        })
      } else {
        console.error("启动定时任务失败:", data.error)
        toast({
          title: "启动失败",
          description: `启动定时任务失败: ${data.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('启动定时任务出错:', error)
      toast({
        title: "网络错误",
        description: "启动定时任务出错，请检查网络连接",
        variant: "destructive",
      })
    }
  }

  const handleActiveTimedTaskStop = async () => {
    if (!currentTemplate) {
      toast({
        title: "操作失败",
        description: "请先选择控制模板",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/trading/timed-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop',
          taskType: 'active',
          templateId: currentTemplate.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setIsActiveTimedTaskRunning(false)
        console.log("主动控制 - 定时任务停止:", data)
        toast({
          title: "任务停止成功",
          description: "主动控制定时任务已停止！",
          variant: "default",
        })
      } else {
        console.error("停止定时任务失败:", data.error)
        toast({
          title: "停止失败",
          description: `停止定时任务失败: ${data.error}。您可以尝试强制清理所有任务。`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('停止定时任务出错:', error)
      toast({
        title: "网络错误",
        description: "停止定时任务出错，请检查网络连接",
        variant: "destructive",
      })
    }
  }

  const handlePassiveTimedTaskStart = async () => {
    if (!currentTemplate) {
      toast({
        title: "操作失败",
        description: "请先选择控制模板",
        variant: "destructive",
      })
      return
    }

    if (!passiveSymbol.trim()) {
      toast({
        title: "操作失败",
        description: "请输入被控所Symbol",
        variant: "destructive",
      })
      return
    }

    if (selectedPassiveAccounts.length === 0) {
      toast({
        title: "操作失败",
        description: "请选择至少一个被动控制账户",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/trading/timed-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          taskType: 'passive',
          templateId: currentTemplate.id,
          config: {
            minTimeSeconds: passiveTimedTaskMinTime,
            maxTimeSeconds: passiveTimedTaskMaxTime,
            minSize: passiveTimedTaskMinSize,
            maxSize: passiveTimedTaskMaxSize,
            buySell: passiveTimedTaskBuySell,
            orderType: passiveTimedTaskOrderType,
            symbol: passiveSymbol,
            accounts: selectedPassiveAccounts,
            maxTradeAmount: passiveTimedTaskMaxTradeAmount,
            amountType: passiveTimedTaskAmountType,
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setIsPassiveTimedTaskRunning(true)
        console.log("被动控制 - 定时任务开启:", data)
        toast({
          title: "任务启动成功",
          description: "被动控制定时任务已开启！",
          variant: "success",
        })
      } else {
        console.error("启动定时任务失败:", data.error)
        toast({
          title: "启动失败",
          description: `启动定时任务失败: ${data.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('启动定时任务出错:', error)
      toast({
        title: "网络错误",
        description: "启动定时任务出错，请检查网络连接",
        variant: "destructive",
      })
    }
  }

  const handlePassiveTimedTaskStop = async () => {
    if (!currentTemplate) {
      toast({
        title: "操作失败",
        description: "请先选择控制模板",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/trading/timed-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop',
          taskType: 'passive',
          templateId: currentTemplate.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setIsPassiveTimedTaskRunning(false)
        console.log("被动控制 - 定时任务停止:", data)
        toast({
          title: "任务停止成功",
          description: "被动控制定时任务已停止！",
          variant: "default",
        })
      } else {
        console.error("停止定时任务失败:", data.error)
        toast({
          title: "停止失败",
          description: `停止定时任务失败: ${data.error}。您可以尝试强制清理所有任务。`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('停止定时任务出错:', error)
      toast({
        title: "网络错误",
        description: "停止定时任务出错，请检查网络连接",
        variant: "destructive",
      })
    }
  }

  const handleStartListening = () => {
    setIsListening(true)
    console.log("启动监听:", { activeSymbol, passiveSymbol })
    toast({
      title: "监听已启动",
      description: `开始监听 ${activeSymbol} / ${passiveSymbol}`,
      variant: "success",
    })
  }

  const handleStopListening = () => {
    setIsListening(false)
    console.log("关闭监听:", { activeSymbol, passiveSymbol })
    toast({
      title: "监听已停止",
      description: `停止监听 ${activeSymbol} / ${passiveSymbol}`,
      variant: "destructive",
    })
  }

  const handleSymbolSync = async () => {
    if (!currentTemplate) {
      toast({
        title: "操作失败",
        description: "请先选择控制模板",
        variant: "destructive",
      })
      return
    }

    if (!activeSymbol.trim() || !passiveSymbol.trim()) {
      toast({
        title: "操作失败",
        description: "请输入主控所Symbol和被控所Symbol",
        variant: "destructive",
      })
      return
    }

    setSymbolSyncing(true)
    
    try {
      // 验证主控所Symbol
      const activeExchange = currentTemplate.activeControl.exchange
      const activeResponse = await fetch(`/api/symbol-validation?exchange=${encodeURIComponent(activeExchange)}&symbol=${encodeURIComponent(activeSymbol)}`)
      const activeData = await activeResponse.json()
      
      // 验证被控所Symbol
      const passiveExchange = currentTemplate.passiveControl.exchange
      const passiveResponse = await fetch(`/api/symbol-validation?exchange=${encodeURIComponent(passiveExchange)}&symbol=${encodeURIComponent(passiveSymbol)}`)
      const passiveData = await passiveResponse.json()
      
      if (activeData.success && passiveData.success) {
        toast({
          title: "Symbol验证成功",
          description: `主控所(${activeExchange}): ${activeSymbol} ✓\n被控所(${passiveExchange}): ${passiveSymbol} ✓`,
          variant: "default",
        })
      } else {
        let errorDetails = []
        if (!activeData.success) {
          errorDetails.push(`主控所(${activeExchange}): ${activeSymbol} ✗ - ${activeData.error}`)
        }
        if (!passiveData.success) {
          errorDetails.push(`被控所(${passiveExchange}): ${passiveSymbol} ✗ - ${passiveData.error}`)
        }
        toast({
          title: "Symbol验证失败",
          description: errorDetails.join('\n'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Symbol同步失败:', error)
      toast({
        title: "网络错误",
        description: "Symbol同步失败，请检查网络连接",
        variant: "destructive",
      })
    } finally {
      setSymbolSyncing(false)
    }
  }

  return (
    <div className="w-full px-4 md:px-6 py-4">
      <div className="grid gap-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="grid gap-2">
            <Label htmlFor="select-template">选择控制模板</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger id="select-template">
                <SelectValue placeholder="选择模板" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="active-symbol-input">主控所Symbol</Label>
            <Input
              id="active-symbol-input"
              value={activeSymbol}
              onChange={(e) => setActiveSymbol(e.target.value.toUpperCase())}
              placeholder="例如: BTC/USDT"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="passive-symbol-input">被控所Symbol</Label>
            <Input
              id="passive-symbol-input"
              value={passiveSymbol}
              onChange={(e) => setPassiveSymbol(e.target.value.toUpperCase())}
              placeholder="例如: BTC/USDT"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSymbolSync}
              disabled={symbolSyncing}
              className="px-3 py-2 text-sm"
              style={{ backgroundColor: '#0F127A', color: 'white' }}
              size="sm"
            >
              {symbolSyncing ? 'Symbol同步中...' : 'Symbol同步'}
            </Button>
            <Button
              onClick={handleStartListening}
              disabled={isListening}
              className={`px-3 py-2 text-sm ${isListening 
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              size="sm"
            >
              启动监听
            </Button>
            <Button
              onClick={handleStopListening}
              disabled={!isListening}
              className={`px-3 py-2 text-sm ${!isListening 
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              size="sm"
            >
              关闭监听
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Active Control */}
        <Card className="bg-card text-card-foreground shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">主动控制</CardTitle>
            {currentTemplate?.activeControl.exchange && (
              <Badge className={getExchangeBadgeColor(currentTemplate.activeControl.exchange)}>
                {currentTemplate.activeControl.exchange}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="grid gap-3">
            <Collapsible open={isAccountsActiveOpen} onOpenChange={setIsAccountsActiveOpen} className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>账户列表信息</Label>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    {isAccountsActiveOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="sr-only">Toggle accounts</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="border border-border rounded-md p-3">
                  {currentTemplate?.activeControl.accounts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">
                      无可用账户
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {currentTemplate?.activeControl.accounts.map((account) => (
                        <div key={account.id} className="flex items-center gap-2 p-2 border border-border rounded-md bg-card">
                          <Checkbox
                            id={`active-acc-${account.id}`}
                            checked={selectedActiveAccounts.includes(account.id)}
                            onCheckedChange={(checked) => handleActiveAccountSelect(account.id, !!checked)}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{account.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {account.apiKey.substring(0, 12)}...
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="grid gap-2">
              <Label htmlFor="active-execution-mode">账户执行模式</Label>
              <Select value={activeExecutionMode} onValueChange={(value: "loop" | "random") => setActiveExecutionMode(value)}>
                <SelectTrigger id="active-execution-mode">
                  <SelectValue placeholder="选择执行模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loop">循环执行</SelectItem>
                  <SelectItem value="random">随机执行</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 订单部分 (手动下单) - 重新设计 */}
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-md font-semibold mb-3 text-foreground">订单部分 (手动下单)</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* GTC LIMIT */}
                <Card className="border border-border rounded-lg p-4 shadow-sm bg-card">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base text-center text-foreground py-2 rounded-md">GTC LIMIT</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-0 pt-0">
                    <div className="grid gap-1">
                      <Label htmlFor="active-gtc-limit-size">数量</Label>
                      <Input
                        id="active-gtc-limit-size"
                        type="number"
                        step="0.01"
                        value={activeGtcLimitSize}
                        onChange={(e) => setActiveGtcLimitSize(Number.parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="active-gtc-limit-buy-sell">买/卖</Label>
                      <Select value={activeGtcLimitBuySell} onValueChange={(value: "buy" | "sell") => setActiveGtcLimitBuySell(value)}>
                        <SelectTrigger id="active-gtc-limit-buy-sell">
                          <SelectValue placeholder="买/卖" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">买入</SelectItem>
                          <SelectItem value="sell">卖出</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="active-gtc-limit-level">OrderBook Level</Label>
                      <Select value={activeGtcLimitLevel} onValueChange={setActiveGtcLimitLevel}>
                        <SelectTrigger id="active-gtc-limit-level">
                          <SelectValue placeholder="等级" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() =>
                        handlePlaceActiveOrder(
                          "GTC LIMIT",
                          activeGtcLimitSize,
                          activeGtcLimitBuySell,
                          activeGtcLimitLevel,
                        )
                      }
                      className="bg-primary text-primary-foreground mt-2"
                    >
                      下单
                    </Button>
                  </CardContent>
                </Card>

                {/* IOC LIMIT */}
                <Card className="border border-border rounded-lg p-4 shadow-sm bg-card">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base text-center text-muted-foreground py-2 rounded-md">
                      IOC LIMIT
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-0 pt-0">
                    <div className="grid gap-1">
                      <Label htmlFor="active-ioc-limit-size">数量</Label>
                      <Input
                        id="active-ioc-limit-size"
                        type="number"
                        step="0.01"
                        value={activeIocLimitSize}
                        onChange={(e) => setActiveIocLimitSize(Number.parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="active-ioc-limit-buy-sell">买/卖</Label>
                      <Select value={activeIocLimitBuySell} onValueChange={(value: "buy" | "sell") => setActiveIocLimitBuySell(value)}>
                        <SelectTrigger id="active-ioc-limit-buy-sell">
                          <SelectValue placeholder="买/卖" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">买入</SelectItem>
                          <SelectItem value="sell">卖出</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="active-ioc-limit-level">OrderBook Level</Label>
                      <Select value={activeIocLimitLevel} onValueChange={setActiveIocLimitLevel}>
                        <SelectTrigger id="active-ioc-limit-level">
                          <SelectValue placeholder="等级" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() =>
                        handlePlaceActiveOrder(
                          "IOC LIMIT",
                          activeIocLimitSize,
                          activeIocLimitBuySell,
                          activeIocLimitLevel,
                        )
                      }
                      className="bg-primary text-primary-foreground mt-2"
                    >
                      下单
                    </Button>
                  </CardContent>
                </Card>

                {/* MARKET */}
                <Card className="border border-primary rounded-lg p-4 shadow-sm bg-primary/10">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base text-center text-primary py-2 rounded-md">MARKET</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-0 pt-0">
                    <div className="grid gap-1">
                      <Label htmlFor="active-market-size">数量</Label>
                      <Input
                        id="active-market-size"
                        type="number"
                        step="0.01"
                        value={activeMarketSize}
                        onChange={(e) => setActiveMarketSize(Number.parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="active-market-buy-sell">买/卖</Label>
                      <Select value={activeMarketBuySell} onValueChange={(value: "buy" | "sell") => setActiveMarketBuySell(value)}>
                        <SelectTrigger id="active-market-buy-sell">
                          <SelectValue placeholder="买/卖" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">买入</SelectItem>
                          <SelectItem value="sell">卖出</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="active-market-level">OrderBook Level</Label>
                      <Select value={activeMarketLevel} onValueChange={setActiveMarketLevel}>
                        <SelectTrigger id="active-market-level">
                          <SelectValue placeholder="等级" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() =>
                        handlePlaceActiveOrder("MARKET", activeMarketSize, activeMarketBuySell, activeMarketLevel)
                      }
                      className="bg-primary text-primary-foreground mt-2"
                    >
                      下单
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 定时任务模块 */}
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-semibold text-foreground">定时任务</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isActiveTimedTaskRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-muted-foreground">
                    {isActiveTimedTaskRunning ? '运行中' : '已停止'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="active-timed-task-min-size">Size (Min)</Label>
                  <Input
                    id="active-timed-task-min-size"
                    type="number"
                    step="0.01"
                    value={activeTimedTaskMinSize}
                    onChange={(e) => setActiveTimedTaskMinSize(Number.parseFloat(e.target.value))}
                    disabled={isActiveTimedTaskRunning}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="active-timed-task-max-size">Size (Max)</Label>
                  <Input
                    id="active-timed-task-max-size"
                    type="number"
                    step="0.01"
                    value={activeTimedTaskMaxSize}
                    onChange={(e) => setActiveTimedTaskMaxSize(Number.parseFloat(e.target.value))}
                    disabled={isActiveTimedTaskRunning}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="active-timed-task-min-time">时间 (Min, 秒)</Label>
                  <Input
                    id="active-timed-task-min-time"
                    type="number"
                    step="1"
                    value={activeTimedTaskMinTime}
                    onChange={(e) => setActiveTimedTaskMinTime(Number.parseInt(e.target.value))}
                    disabled={isActiveTimedTaskRunning}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="active-timed-task-max-time">时间 (Max, 秒)</Label>
                  <Input
                    id="active-timed-task-max-time"
                    type="number"
                    step="1"
                    value={activeTimedTaskMaxTime}
                    onChange={(e) => setActiveTimedTaskMaxTime(Number.parseInt(e.target.value))}
                    disabled={isActiveTimedTaskRunning}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="active-timed-task-buy-sell">买/卖</Label>
                  <Select value={activeTimedTaskBuySell} onValueChange={(value: "buy" | "sell") => setActiveTimedTaskBuySell(value)} disabled={isActiveTimedTaskRunning}>
                    <SelectTrigger id="active-timed-task-buy-sell">
                      <SelectValue placeholder="买/卖" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">买入</SelectItem>
                      <SelectItem value="sell">卖出</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="active-timed-task-order-book-level">OrderBook Level</Label>
                  <Select value={activeTimedTaskOrderBookLevel} onValueChange={setActiveTimedTaskOrderBookLevel} disabled={isActiveTimedTaskRunning}>
                    <SelectTrigger id="active-timed-task-order-book-level">
                      <SelectValue placeholder="等级" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="active-timed-task-order-type">订单类型</Label>
                  <Select value={activeTimedTaskOrderType} onValueChange={(value: "GTC LIMIT" | "IOC LIMIT" | "MARKET") => setActiveTimedTaskOrderType(value)} disabled={isActiveTimedTaskRunning}>
                    <SelectTrigger id="active-timed-task-order-type">
                      <SelectValue placeholder="选择订单类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GTC LIMIT">GTC LIMIT</SelectItem>
                      <SelectItem value="IOC LIMIT">IOC LIMIT</SelectItem>
                      <SelectItem value="MARKET">MARKET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="active-timed-task-eat-limit">吃单限制</Label>
                  <Input
                    id="active-timed-task-eat-limit"
                    type="number"
                    step="0.01"
                    value={activeTimedTaskEatLimit}
                    onChange={(e) => setActiveTimedTaskEatLimit(Number.parseFloat(e.target.value))}
                    placeholder="吃单限制数量"
                    disabled={isActiveTimedTaskRunning}
                  />
                </div>
              </div>
              <div className="grid gap-2 mt-4">
                <Label htmlFor="active-timed-task-max-amount">最大交易量</Label>
                <div className="flex gap-2">
                  <Input
                    id="active-timed-task-max-amount"
                    type="number"
                    step="0.01"
                    value={activeTimedTaskMaxTradeAmount}
                    onChange={(e) => setActiveTimedTaskMaxTradeAmount(Number.parseFloat(e.target.value))}
                    placeholder="最大交易量"
                    className="flex-1"
                    disabled={isActiveTimedTaskRunning}
                  />
                  <div className="flex border border-input rounded-md">
                    <Button
                      type="button"
                      variant={activeTimedTaskAmountType === "USDT" ? "default" : "ghost"}
                      onClick={() => setActiveTimedTaskAmountType("USDT")}
                      className="rounded-r-none border-r"
                      size="sm"
                      disabled={isActiveTimedTaskRunning}
                    >
                      USDT
                    </Button>
                    <Button
                      type="button"
                      variant={activeTimedTaskAmountType === "TOKEN" ? "default" : "ghost"}
                      onClick={() => setActiveTimedTaskAmountType("TOKEN")}
                      className="rounded-l-none"
                      size="sm"
                      disabled={isActiveTimedTaskRunning}
                    >
                      TOKEN
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-4">
                <Button 
                  variant="outline" 
                  onClick={handleActiveTimedTaskStop} 
                  disabled={!isActiveTimedTaskRunning}
                  className={`${!isActiveTimedTaskRunning 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                    : 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                  }`}
                >
                  停止
                </Button>
                <Button
                  onClick={handleActiveTimedTaskStart}
                  disabled={isActiveTimedTaskRunning}
                  className={`${isActiveTimedTaskRunning 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  开启
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passive Control */}
        <Card className="bg-card text-card-foreground shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">被动控制</CardTitle>
            {currentTemplate?.passiveControl.exchange && (
              <Badge className={getExchangeBadgeColor(currentTemplate.passiveControl.exchange)}>
                {currentTemplate.passiveControl.exchange}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="grid gap-3">
            <Collapsible open={isAccountsPassiveOpen} onOpenChange={setIsAccountsPassiveOpen} className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>账户列表信息</Label>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    {isAccountsPassiveOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="sr-only">Toggle accounts</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="border border-border rounded-md p-3">
                  {currentTemplate?.passiveControl.accounts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">
                      无可用账户
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {currentTemplate?.passiveControl.accounts.map((account) => (
                        <div key={account.id} className="flex items-center gap-2 p-2 border border-border rounded-md bg-card">
                          <Checkbox
                            id={`passive-acc-${account.id}`}
                            checked={selectedPassiveAccounts.includes(account.id)}
                            onCheckedChange={(checked) => handlePassiveAccountSelect(account.id, !!checked)}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{account.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {account.apiKey.substring(0, 12)}...
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="grid gap-2">
              <Label htmlFor="passive-execution-mode">账户执行模式</Label>
              <Select value={passiveExecutionMode} onValueChange={(value: "loop" | "random") => setPassiveExecutionMode(value)}>
                <SelectTrigger id="passive-execution-mode">
                  <SelectValue placeholder="选择执行模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loop">循环执行</SelectItem>
                  <SelectItem value="random">随机执行</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 订单部分 (手动下单) - 重新设计 */}
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-md font-semibold mb-3 text-foreground">订单部分 (手动下单)</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* GTC LIMIT */}
                <Card className="border border-border rounded-lg p-4 shadow-sm bg-card">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base text-center text-foreground py-2 rounded-md">GTC LIMIT</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-0 pt-0">
                    <div className="grid gap-1">
                      <Label htmlFor="passive-gtc-limit-size">数量</Label>
                      <Input
                        id="passive-gtc-limit-size"
                        type="number"
                        step="0.01"
                        value={passiveGtcLimitSize}
                        onChange={(e) => setPassiveGtcLimitSize(Number.parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="passive-gtc-limit-buy-sell">买/卖</Label>
                      <Select value={passiveGtcLimitBuySell} onValueChange={(value: "buy" | "sell") => setPassiveGtcLimitBuySell(value)}>
                        <SelectTrigger id="passive-gtc-limit-buy-sell">
                          <SelectValue placeholder="买/卖" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">买入</SelectItem>
                          <SelectItem value="sell">卖出</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div className="grid gap-1">
                        <Label htmlFor="passive-gtc-limit-level">OrderBook Level</Label>
                        <Select value={passiveGtcLimitLevel} onValueChange={setPassiveGtcLimitLevel}>
                          <SelectTrigger id="passive-gtc-limit-level">
                            <SelectValue placeholder="等级" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="passive-gtc-limit-price">价格</Label>
                        <Input
                          id="passive-gtc-limit-price"
                          type="number"
                          step="0.000001"
                          value={passiveGtcLimitPrice}
                          onChange={(e) => setPassiveGtcLimitPrice(Number.parseFloat(e.target.value))}
                          placeholder="价格"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() =>
                        handlePlacePassiveOrder(
                          "GTC LIMIT",
                          passiveGtcLimitSize,
                          passiveGtcLimitBuySell,
                          passiveGtcLimitLevel,
                          passiveGtcLimitPrice,
                        )
                      }
                      className="bg-primary text-primary-foreground mt-2"
                    >
                      下单
                    </Button>
                  </CardContent>
                </Card>

                {/* IOC LIMIT */}
                <Card className="border border-border rounded-lg p-4 shadow-sm bg-card">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base text-center text-muted-foreground py-2 rounded-md">
                      IOC LIMIT
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-0 pt-0">
                    <div className="grid gap-1">
                      <Label htmlFor="passive-ioc-limit-size">数量</Label>
                      <Input
                        id="passive-ioc-limit-size"
                        type="number"
                        step="0.01"
                        value={passiveIocLimitSize}
                        onChange={(e) => setPassiveIocLimitSize(Number.parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="passive-ioc-limit-buy-sell">买/卖</Label>
                      <Select value={passiveIocLimitBuySell} onValueChange={(value: "buy" | "sell") => setPassiveIocLimitBuySell(value)}>
                        <SelectTrigger id="passive-ioc-limit-buy-sell">
                          <SelectValue placeholder="买/卖" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">买入</SelectItem>
                          <SelectItem value="sell">卖出</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div className="grid gap-1">
                        <Label htmlFor="passive-ioc-limit-level">OrderBook Level</Label>
                        <Select value={passiveIocLimitLevel} onValueChange={setPassiveIocLimitLevel}>
                          <SelectTrigger id="passive-ioc-limit-level">
                            <SelectValue placeholder="等级" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="passive-ioc-limit-price">价格</Label>
                        <Input
                          id="passive-ioc-limit-price"
                          type="number"
                          step="0.000001"
                          value={passiveIocLimitPrice}
                          onChange={(e) => setPassiveIocLimitPrice(Number.parseFloat(e.target.value))}
                          placeholder="价格"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() =>
                        handlePlacePassiveOrder(
                          "IOC LIMIT",
                          passiveIocLimitSize,
                          passiveIocLimitBuySell,
                          passiveIocLimitLevel,
                          passiveIocLimitPrice,
                        )
                      }
                      className="bg-primary text-primary-foreground mt-2"
                    >
                      下单
                    </Button>
                  </CardContent>
                </Card>

                {/* MARKET */}
                <Card className="border border-primary rounded-lg p-4 shadow-sm bg-primary/10">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base text-center text-primary py-2 rounded-md">MARKET</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-0 pt-0">
                    <div className="grid gap-1">
                      <Label htmlFor="passive-market-size">数量</Label>
                      <Input
                        id="passive-market-size"
                        type="number"
                        step="0.01"
                        value={passiveMarketSize}
                        onChange={(e) => setPassiveMarketSize(Number.parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="passive-market-buy-sell">买/卖</Label>
                      <Select value={passiveMarketBuySell} onValueChange={(value: "buy" | "sell") => setPassiveMarketBuySell(value)}>
                        <SelectTrigger id="passive-market-buy-sell">
                          <SelectValue placeholder="买/卖" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">买入</SelectItem>
                          <SelectItem value="sell">卖出</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div className="grid gap-1">
                        <Label htmlFor="passive-market-level">OrderBook Level</Label>
                        <Select value={passiveMarketLevel} onValueChange={setPassiveMarketLevel}>
                          <SelectTrigger id="passive-market-level">
                            <SelectValue placeholder="等级" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="passive-market-price">价格</Label>
                        <Input
                          id="passive-market-price"
                          type="number"
                          step="0.000001"
                          value={passiveMarketPrice}
                          onChange={(e) => setPassiveMarketPrice(Number.parseFloat(e.target.value))}
                          placeholder="价格"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() =>
                        handlePlacePassiveOrder(
                          "MARKET",
                          passiveMarketSize,
                          passiveMarketBuySell,
                          passiveMarketLevel,
                          passiveMarketPrice,
                        )
                      }
                      className="bg-primary text-primary-foreground mt-2"
                    >
                      下单
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 定时任务模块 */}
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-semibold text-foreground">定时任务</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isPassiveTimedTaskRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-muted-foreground">
                    {isPassiveTimedTaskRunning ? '运行中' : '已停止'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="passive-timed-task-min-size">Size (Min)</Label>
                  <Input
                    id="passive-timed-task-min-size"
                    type="number"
                    step="0.01"
                    value={passiveTimedTaskMinSize}
                    onChange={(e) => setPassiveTimedTaskMinSize(Number.parseFloat(e.target.value))}
                    disabled={isPassiveTimedTaskRunning}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="passive-timed-task-max-size">Size (Max)</Label>
                  <Input
                    id="passive-timed-task-max-size"
                    type="number"
                    step="0.01"
                    value={passiveTimedTaskMaxSize}
                    onChange={(e) => setPassiveTimedTaskMaxSize(Number.parseFloat(e.target.value))}
                    disabled={isPassiveTimedTaskRunning}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="passive-timed-task-min-time">时间 (Min, 秒)</Label>
                  <Input
                    id="passive-timed-task-min-time"
                    type="number"
                    step="1"
                    value={passiveTimedTaskMinTime}
                    onChange={(e) => setPassiveTimedTaskMinTime(Number.parseInt(e.target.value))}
                    disabled={isPassiveTimedTaskRunning}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="passive-timed-task-max-time">时间 (Max, 秒)</Label>
                  <Input
                    id="passive-timed-task-max-time"
                    type="number"
                    step="1"
                    value={passiveTimedTaskMaxTime}
                    onChange={(e) => setPassiveTimedTaskMaxTime(Number.parseInt(e.target.value))}
                    disabled={isPassiveTimedTaskRunning}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="passive-timed-task-buy-sell">买/卖</Label>
                  <Select value={passiveTimedTaskBuySell} onValueChange={(value: "buy" | "sell") => setPassiveTimedTaskBuySell(value)} disabled={isPassiveTimedTaskRunning}>
                    <SelectTrigger id="passive-timed-task-buy-sell">
                      <SelectValue placeholder="买/卖" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">买入</SelectItem>
                      <SelectItem value="sell">卖出</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="passive-timed-task-order-type">订单类型</Label>
                  <Select value={passiveTimedTaskOrderType} onValueChange={(value: "GTC LIMIT" | "IOC LIMIT" | "MARKET") => setPassiveTimedTaskOrderType(value)} disabled={isPassiveTimedTaskRunning}>
                    <SelectTrigger id="passive-timed-task-order-type">
                      <SelectValue placeholder="选择订单类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GTC LIMIT">GTC LIMIT</SelectItem>
                      <SelectItem value="IOC LIMIT">IOC LIMIT</SelectItem>
                      <SelectItem value="MARKET">MARKET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2 mt-4">
                <Label htmlFor="passive-timed-task-max-amount">最大交易量</Label>
                <div className="flex gap-2">
                  <Input
                    id="passive-timed-task-max-amount"
                    type="number"
                    step="0.01"
                    value={passiveTimedTaskMaxTradeAmount}
                    onChange={(e) => setPassiveTimedTaskMaxTradeAmount(Number.parseFloat(e.target.value))}
                    placeholder="最大交易量"
                    className="flex-1"
                    disabled={isPassiveTimedTaskRunning}
                  />
                  <div className="flex border border-input rounded-md">
                    <Button
                      type="button"
                      variant={passiveTimedTaskAmountType === "USDT" ? "default" : "ghost"}
                      onClick={() => setPassiveTimedTaskAmountType("USDT")}
                      className="rounded-r-none border-r"
                      size="sm"
                      disabled={isPassiveTimedTaskRunning}
                    >
                      USDT
                    </Button>
                    <Button
                      type="button"
                      variant={passiveTimedTaskAmountType === "TOKEN" ? "default" : "ghost"}
                      onClick={() => setPassiveTimedTaskAmountType("TOKEN")}
                      className="rounded-l-none"
                      size="sm"
                      disabled={isPassiveTimedTaskRunning}
                    >
                      TOKEN
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePassiveTimedTaskStop} 
                  disabled={!isPassiveTimedTaskRunning}
                  className={`${!isPassiveTimedTaskRunning 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                    : 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                  }`}
                >
                  停止
                </Button>
                <Button
                  onClick={handlePassiveTimedTaskStart}
                  disabled={isPassiveTimedTaskRunning}
                  className={`${isPassiveTimedTaskRunning 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  开启
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
