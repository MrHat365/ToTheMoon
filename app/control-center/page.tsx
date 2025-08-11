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
  status: "enabled" | "disabled"
  runningStatus: "running" | "stopped"
  activeControl: ControlConfig
  passiveControl: ControlConfig
}

// Mock data for templates (should ideally come from a global state or API)
const mockTemplates: Template[] = [
  {
    id: "1",
    name: "BTC-USDT Strategy",
    status: "enabled",
    runningStatus: "running",
    activeControl: {
      exchange: "Binance",
      accounts: [
        {
          id: "acc1",
          name: "Binance Main",
          apiKey: "key1_binance_abcdef1234567890",
          secretKey: "sec1_binance",
          passphrase: "pass1_binance",
        },
        {
          id: "acc5",
          name: "Binance Sub",
          apiKey: "key5_binance_ghijkl0987654321",
          secretKey: "sec5_binance",
          passphrase: "pass5_binance",
        },
      ],
      executionMode: "loop",
    },
    passiveControl: {
      exchange: "Coinbase",
      accounts: [
        {
          id: "acc2",
          name: "Coinbase Main",
          apiKey: "key2_coinbase_mnopq1234567890",
          secretKey: "sec2_coinbase",
          passphrase: "pass2_coinbase",
        },
      ],
      executionMode: "random",
    },
  },
  {
    id: "2",
    name: "ETH-BUSD Arbitrage",
    status: "disabled",
    runningStatus: "stopped",
    activeControl: {
      exchange: "Kraken",
      accounts: [
        {
          id: "acc3",
          name: "Kraken Spot",
          apiKey: "key3_kraken_rstuv1234567890",
          secretKey: "sec3_kraken",
          passphrase: "pass3_kraken",
        },
      ],
      executionMode: "random",
    },
    passiveControl: {
      exchange: "Binance",
      accounts: [
        {
          id: "acc4",
          name: "Binance Futures",
          apiKey: "key4_binance_wxyz0987654321",
          secretKey: "sec4_binance",
          passphrase: "pass4_binance",
        },
      ],
      executionMode: "loop",
    },
  },
]

// Helper function to get badge color based on exchange - now using neutral secondary colors
const getExchangeBadgeColor = (exchange: string) => {
  // Using shadcn's secondary colors for neutral badge look
  return "bg-secondary text-secondary-foreground"
}

export default function ControlCenterPage() {
  const searchParams = useSearchParams()
  const initialTemplateId = searchParams.get("templateId")

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId || mockTemplates[0]?.id || "")
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)
  const [symbol, setSymbol] = useState("BTC/USDT")

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

  useEffect(() => {
    const template = mockTemplates.find((t) => t.id === selectedTemplateId)
    setCurrentTemplate(template || null)
    if (template) {
      setSelectedActiveAccounts(template.activeControl.accounts.map((acc) => acc.id))
      setSelectedPassiveAccounts(template.passiveControl.accounts.map((acc) => acc.id))
      setActiveExecutionMode(template.activeControl.executionMode) // Set initial execution mode
      setPassiveExecutionMode(template.passiveControl.executionMode) // Set initial execution mode
    } else {
      setSelectedActiveAccounts([])
      setSelectedPassiveAccounts([])
      setActiveExecutionMode("loop") // Default if no template
      setPassiveExecutionMode("loop") // Default if no template
    }
  }, [selectedTemplateId])

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
      symbol,
      orderType,
      size,
      buySell,
      level,
      accounts: selectedActiveAccounts,
    })
    alert(`主动控制 - 手动下单 (${orderType}) 成功！请查看控制台日志。`)
  }

  const handlePlacePassiveOrder = (orderType: string, size: number, buySell: string, level: string, price?: number) => {
    console.log(`被动控制 - 手动下单 (${orderType}):`, {
      template: currentTemplate?.name,
      symbol,
      orderType,
      size,
      buySell,
      level,
      price, // Include price for passive orders
      accounts: selectedPassiveAccounts,
    })
    alert(`被动控制 - 手动下单 (${orderType}) 成功！请查看控制台日志。`)
  }

  const handleActiveTimedTaskStart = () => {
    setIsActiveTimedTaskRunning(true)
    console.log("主动控制 - 定时任务开启:", {
      minSize: activeTimedTaskMinSize,
      maxSize: activeTimedTaskMaxSize,
      buySell: activeTimedTaskBuySell,
      orderBookLevel: activeTimedTaskOrderBookLevel,
      orderType: activeTimedTaskOrderType,
      eatLimit: activeTimedTaskEatLimit,
      minTime: activeTimedTaskMinTime,
      maxTime: activeTimedTaskMaxTime,
      maxTradeAmount: activeTimedTaskMaxTradeAmount,
      amountType: activeTimedTaskAmountType,
    })
    alert("主动控制 - 定时任务已开启！")
  }

  const handleActiveTimedTaskStop = () => {
    setIsActiveTimedTaskRunning(false)
    console.log("主动控制 - 定时任务停止")
    alert("主动控制 - 定时任务已停止！")
  }

  const handlePassiveTimedTaskStart = () => {
    setIsPassiveTimedTaskRunning(true)
    console.log("被动控制 - 定时任务开启:", {
      minSize: passiveTimedTaskMinSize,
      maxSize: passiveTimedTaskMaxSize,
      buySell: passiveTimedTaskBuySell,
      orderType: passiveTimedTaskOrderType,
      minTime: passiveTimedTaskMinTime,
      maxTime: passiveTimedTaskMaxTime,
      maxTradeAmount: passiveTimedTaskMaxTradeAmount,
      amountType: passiveTimedTaskAmountType,
    })
    alert("被动控制 - 定时任务已开启！")
  }

  const handlePassiveTimedTaskStop = () => {
    setIsPassiveTimedTaskRunning(false)
    console.log("被动控制 - 定时任务停止")
    alert("被动控制 - 定时任务已停止！")
  }

  return (
    <div className="w-full px-4 md:px-6 py-4">
      <div className="grid gap-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="grid gap-2">
            <Label htmlFor="select-template">选择控制模板</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger id="select-template">
                <SelectValue placeholder="选择模板" />
              </SelectTrigger>
              <SelectContent>
                {mockTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="symbol-input">Symbol</Label>
            <Input
              id="symbol-input"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g., BTC/USDT"
            />
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
              <Select value={activeExecutionMode} onValueChange={setActiveExecutionMode}>
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
                      <Select value={activeGtcLimitBuySell} onValueChange={setActiveGtcLimitBuySell}>
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
                      <Select value={activeIocLimitBuySell} onValueChange={setActiveIocLimitBuySell}>
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
                      <Select value={activeMarketBuySell} onValueChange={setActiveMarketBuySell}>
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
              <h3 className="text-md font-semibold mb-3 text-foreground">定时任务</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="active-timed-task-min-size">Size (Min)</Label>
                  <Input
                    id="active-timed-task-min-size"
                    type="number"
                    step="0.01"
                    value={activeTimedTaskMinSize}
                    onChange={(e) => setActiveTimedTaskMinSize(Number.parseFloat(e.target.value))}
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
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="active-timed-task-buy-sell">买/卖</Label>
                  <Select value={activeTimedTaskBuySell} onValueChange={(value: "buy" | "sell") => setActiveTimedTaskBuySell(value)}>
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
                  <Select value={activeTimedTaskOrderBookLevel} onValueChange={setActiveTimedTaskOrderBookLevel}>
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
                  <Select value={activeTimedTaskOrderType} onValueChange={(value: "GTC LIMIT" | "IOC LIMIT" | "MARKET") => setActiveTimedTaskOrderType(value)}>
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
                  />
                  <div className="flex border border-input rounded-md">
                    <Button
                      type="button"
                      variant={activeTimedTaskAmountType === "USDT" ? "default" : "ghost"}
                      onClick={() => setActiveTimedTaskAmountType("USDT")}
                      className="rounded-r-none border-r"
                      size="sm"
                    >
                      USDT
                    </Button>
                    <Button
                      type="button"
                      variant={activeTimedTaskAmountType === "TOKEN" ? "default" : "ghost"}
                      onClick={() => setActiveTimedTaskAmountType("TOKEN")}
                      className="rounded-l-none"
                      size="sm"
                    >
                      TOKEN
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-4">
                <Button variant="outline" onClick={handleActiveTimedTaskStop} disabled={!isActiveTimedTaskRunning}>
                  停止
                </Button>
                <Button
                  onClick={handleActiveTimedTaskStart}
                  disabled={isActiveTimedTaskRunning}
                  className="bg-primary text-primary-foreground"
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
              <Select value={passiveExecutionMode} onValueChange={setPassiveExecutionMode}>
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
                      <Select value={passiveGtcLimitBuySell} onValueChange={setPassiveGtcLimitBuySell}>
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
                      <Select value={passiveIocLimitBuySell} onValueChange={setPassiveIocLimitBuySell}>
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
                      <Select value={passiveMarketBuySell} onValueChange={setPassiveMarketBuySell}>
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
              <h3 className="text-md font-semibold mb-3 text-foreground">定时任务</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="passive-timed-task-min-size">Size (Min)</Label>
                  <Input
                    id="passive-timed-task-min-size"
                    type="number"
                    step="0.01"
                    value={passiveTimedTaskMinSize}
                    onChange={(e) => setPassiveTimedTaskMinSize(Number.parseFloat(e.target.value))}
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
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="passive-timed-task-buy-sell">买/卖</Label>
                  <Select value={passiveTimedTaskBuySell} onValueChange={setPassiveTimedTaskBuySell}>
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
                  <Select value={passiveTimedTaskOrderType} onValueChange={setPassiveTimedTaskOrderType}>
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
                  />
                  <div className="flex border border-input rounded-md">
                    <Button
                      type="button"
                      variant={passiveTimedTaskAmountType === "USDT" ? "default" : "ghost"}
                      onClick={() => setPassiveTimedTaskAmountType("USDT")}
                      className="rounded-r-none border-r"
                      size="sm"
                    >
                      USDT
                    </Button>
                    <Button
                      type="button"
                      variant={passiveTimedTaskAmountType === "TOKEN" ? "default" : "ghost"}
                      onClick={() => setPassiveTimedTaskAmountType("TOKEN")}
                      className="rounded-l-none"
                      size="sm"
                    >
                      TOKEN
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-4">
                <Button variant="outline" onClick={handlePassiveTimedTaskStop} disabled={!isPassiveTimedTaskRunning}>
                  停止
                </Button>
                <Button
                  onClick={handlePassiveTimedTaskStart}
                  disabled={isPassiveTimedTaskRunning}
                  className="bg-primary text-primary-foreground"
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
