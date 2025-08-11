"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { PlusCircle, XCircle } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Account {
  id: string
  name: string // 新增账户名称
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
  runningStatus: "running" | "stopped" // Not editable in dialog
  activeControl: ControlConfig
  passiveControl: ControlConfig
}

interface TemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (template: Template) => void
  initialData?: Template | null
}

// 初始账户对象增加 name 字段
const initialAccount: Account = { id: "", name: "", apiKey: "", secretKey: "", passphrase: "" }

export default function TemplateDialog({ isOpen, onClose, onSave, initialData }: TemplateDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [templateName, setTemplateName] = useState("")
  const [templateStatus, setTemplateStatus] = useState(true) // true for enabled, false for disabled

  const [activeExchange, setActiveExchange] = useState("Binance")
  const [activeAccounts, setActiveAccounts] = useState<Account[]>([initialAccount])
  const [activeExecutionMode, setActiveExecutionMode] = useState<"loop" | "random">("loop")

  const [passiveExchange, setPassiveExchange] = useState("Binance")
  const [passiveAccounts, setPassiveAccounts] = useState<Account[]>([initialAccount])
  const [passiveExecutionMode, setPassiveExecutionMode] = useState<"loop" | "random">("loop")

  useEffect(() => {
    if (initialData) {
      setTemplateName(initialData.name)
      setTemplateStatus(initialData.status === "enabled")
      setActiveExchange(initialData.activeControl.exchange)
      // 确保加载时账户有 name 字段，如果旧数据没有则给空字符串
      setActiveAccounts(
        initialData.activeControl.accounts.length > 0
          ? initialData.activeControl.accounts.map((acc) => ({ ...acc, name: acc.name || "" }))
          : [initialAccount],
      )
      setActiveExecutionMode(initialData.activeControl.executionMode)
      setPassiveExchange(initialData.passiveControl.exchange)
      // 确保加载时账户有 name 字段，如果旧数据没有则给空字符串
      setPassiveAccounts(
        initialData.passiveControl.accounts.length > 0
          ? initialData.passiveControl.accounts.map((acc) => ({ ...acc, name: acc.name || "" }))
          : [initialAccount],
      )
      setPassiveExecutionMode(initialData.passiveControl.executionMode)
    } else {
      // Reset form for new template
      setTemplateName("")
      setTemplateStatus(true)
      setActiveExchange("Binance")
      setActiveAccounts([initialAccount])
      setActiveExecutionMode("loop")
      setPassiveExchange("Binance")
      setPassiveAccounts([initialAccount])
      setPassiveExecutionMode("loop")
    }
  }, [initialData, isOpen]) // Reset when dialog opens or initialData changes

  const handleAddAccount = (controlType: "active" | "passive") => {
    const newAccount = { id: `temp-${Date.now()}-${Math.random()}`, name: "", apiKey: "", secretKey: "", passphrase: "" }
    if (controlType === "active") {
      setActiveAccounts([...activeAccounts, newAccount])
    } else {
      setPassiveAccounts([...passiveAccounts, newAccount])
    }
  }

  const handleRemoveAccount = (controlType: "active" | "passive", id: string) => {
    if (controlType === "active") {
      setActiveAccounts(activeAccounts.filter((acc) => acc.id !== id))
    } else {
      setPassiveAccounts(passiveAccounts.filter((acc) => acc.id !== id))
    }
  }

  const handleAccountChange = (
    controlType: "active" | "passive",
    id: string,
    field: keyof Omit<Account, "id">,
    value: string,
  ) => {
    if (controlType === "active") {
      setActiveAccounts(activeAccounts.map((acc) => (acc.id === id ? { ...acc, [field]: value } : acc)))
    } else {
      setPassiveAccounts(passiveAccounts.map((acc) => (acc.id === id ? { ...acc, [field]: value } : acc)))
    }
  }

  const handleSubmit = () => {
    const newTemplate: Template = {
      id: initialData?.id || `template-${Date.now()}-${Math.random()}`,
      name: templateName,
      status: templateStatus ? "enabled" : "disabled",
      runningStatus: initialData?.runningStatus || "stopped", // Keep existing status or default to stopped
      activeControl: {
        exchange: activeExchange,
        accounts: activeAccounts.filter((acc) => acc.apiKey && acc.secretKey), // Only save valid accounts
        executionMode: activeExecutionMode,
      },
      passiveControl: {
        exchange: passiveExchange,
        accounts: passiveAccounts.filter((acc) => acc.apiKey && acc.secretKey), // Only save valid accounts
        executionMode: passiveExecutionMode,
      },
    }
    onSave(newTemplate)
  }

  const formContent = (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="template-name" className="text-right">
          模板名称
        </Label>
        <Input
          id="template-name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="template-status" className="text-right">
          模板状态
        </Label>
        <div className="col-span-3 flex items-center gap-2">
          <Switch id="template-status" checked={templateStatus} onCheckedChange={setTemplateStatus} />
          <span>{templateStatus ? "开启" : "关闭"}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-4">
        {/* Active Control - 卡片背景在浅色模式下为白色，暗色模式下为深灰色 */}
        <Card className="bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">主动控制</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="active-exchange">交易所</Label>
              <Select value={activeExchange} onValueChange={setActiveExchange}>
                <SelectTrigger id="active-exchange">
                  <SelectValue placeholder="选择交易所" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Binance">Binance</SelectItem>
                  <SelectItem value="Coinbase">Coinbase</SelectItem>
                  <SelectItem value="Kraken">Kraken</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>账户列表</Label>
              {activeAccounts.map((account, index) => (
                <div key={account.id} className="flex flex-col gap-2 p-2 border border-border rounded-md mb-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`active-account-name-${account.id}`} className="text-sm font-medium">
                      账户 {index + 1}
                    </Label>
                    {activeAccounts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAccount("active", account.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="sr-only">移除账户</span>
                      </Button>
                    )}
                  </div>
                  <Input
                    id={`active-account-name-${account.id}`}
                    placeholder="账户名称"
                    value={account.name}
                    onChange={(e) => handleAccountChange("active", account.id, "name", e.target.value)}
                  />
                  <Input
                    placeholder="API Key"
                    value={account.apiKey}
                    onChange={(e) => handleAccountChange("active", account.id, "apiKey", e.target.value)}
                  />
                  <Input
                    placeholder="Secret Key"
                    value={account.secretKey}
                    onChange={(e) => handleAccountChange("active", account.id, "secretKey", e.target.value)}
                  />
                  <Input
                    placeholder="Passphrase"
                    value={account.passphrase}
                    onChange={(e) => handleAccountChange("active", account.id, "passphrase", e.target.value)}
                  />
                </div>
              ))}
              <Button variant="outline" onClick={() => handleAddAccount("active")} className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" /> 添加账户
              </Button>
            </div>
            {/* 账户执行模型：当账户数量大于等于2时显示 */}
            {activeAccounts.length >= 2 && (
              <div className="grid gap-2">
                <Label htmlFor="active-execution-mode">账户执行模型</Label>
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
            )}
          </CardContent>
        </Card>

        {/* Passive Control - 卡片背景在浅色模式下为白色，暗色模式下为深灰色 */}
        <Card className="bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">被动控制</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="passive-exchange">交易所</Label>
              <Select value={passiveExchange} onValueChange={setPassiveExchange}>
                <SelectTrigger id="passive-exchange">
                  <SelectValue placeholder="选择交易所" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Binance">Binance</SelectItem>
                  <SelectItem value="Coinbase">Coinbase</SelectItem>
                  <SelectItem value="Kraken">Kraken</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>账户列表</Label>
              {passiveAccounts.map((account, index) => (
                <div key={account.id} className="flex flex-col gap-2 p-2 border border-border rounded-md mb-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`passive-account-name-${account.id}`} className="text-sm font-medium">
                      账户 {index + 1}
                    </Label>
                    {passiveAccounts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAccount("passive", account.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="sr-only">移除账户</span>
                      </Button>
                    )}
                  </div>
                  <Input
                    id={`passive-account-name-${account.id}`}
                    placeholder="账户名称"
                    value={account.name}
                    onChange={(e) => handleAccountChange("passive", account.id, "name", e.target.value)}
                  />
                  <Input
                    placeholder="API Key"
                    value={account.apiKey}
                    onChange={(e) => handleAccountChange("passive", account.id, "apiKey", e.target.value)}
                  />
                  <Input
                    placeholder="Secret Key"
                    value={account.secretKey}
                    onChange={(e) => handleAccountChange("passive", account.id, "secretKey", e.target.value)}
                  />
                  <Input
                    placeholder="Passphrase"
                    value={account.passphrase}
                    onChange={(e) => handleAccountChange("passive", account.id, "passphrase", e.target.value)}
                  />
                </div>
              ))}
              <Button variant="outline" onClick={() => handleAddAccount("passive")} className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" /> 添加账户
              </Button>
            </div>
            {/* 账户执行模型：当账户数量大于等于2时显示 */}
            {passiveAccounts.length >= 2 && (
              <div className="grid gap-2">
                <Label htmlFor="passive-execution-mode">账户执行模型</Label>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{initialData ? "编辑模板" : "新建模板"}</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSubmit} className="bg-primary text-primary-foreground">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh] overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>{initialData ? "编辑模板" : "新建模板"}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4">{formContent}</div>
        <DrawerFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} className="bg-primary text-primary-foreground">
            保存
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
