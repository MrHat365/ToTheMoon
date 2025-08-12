"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircle, XCircle } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useExchanges } from "@/hooks/use-exchanges"
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
  const { exchanges, loading: exchangesLoading, error: exchangesError } = useExchanges()
  
  const [templateName, setTemplateName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const [activeExchange, setActiveExchange] = useState("")
  const [activeAccounts, setActiveAccounts] = useState<Account[]>([initialAccount])
  const [activeExecutionMode, setActiveExecutionMode] = useState<"loop" | "random">("loop")

  const [passiveExchange, setPassiveExchange] = useState("")
  const [passiveAccounts, setPassiveAccounts] = useState<Account[]>([initialAccount])
  const [passiveExecutionMode, setPassiveExecutionMode] = useState<"loop" | "random">("loop")

  useEffect(() => {
    if (initialData) {
      setTemplateName(initialData.name)
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
      // Reset form for new template - 只有在有交易所数据时才重置
      setTemplateName("")
      if (exchanges.length > 0) {
        setActiveExchange(exchanges[0])
        setPassiveExchange(exchanges[0])
      }
      setActiveAccounts([initialAccount])
      setActiveExecutionMode("loop")
      setPassiveAccounts([initialAccount])
      setPassiveExecutionMode("loop")
    }
  }, [initialData, isOpen]) // 移除defaultExchange依赖避免循环

  // 当交易所列表加载完成且没有初始数据时，设置默认交易所
  useEffect(() => {
    if (!initialData && exchanges.length > 0 && !exchangesLoading) {
      setActiveExchange(exchanges[0])
      setPassiveExchange(exchanges[0])
    }
  }, [exchanges, exchangesLoading, initialData])

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

  const handleSubmit = async () => {
    const errors: string[] = []
    
    // 基本验证
    if (!templateName.trim()) {
      errors.push('请输入模板名称')
    }
    
    if (!activeExchange) {
      errors.push('请选择主动控制交易所')
    }
    
    if (!passiveExchange) {
      errors.push('请选择被动控制交易所')
    }
    
    // 验证账户信息
    const validActiveAccounts = activeAccounts.filter((acc) => acc.apiKey && acc.secretKey)
    const validPassiveAccounts = passiveAccounts.filter((acc) => acc.apiKey && acc.secretKey)
    
    if (validActiveAccounts.length === 0) {
      errors.push('主动控制至少需要一个有效账户（包含API Key和Secret Key）')
    }
    
    if (validPassiveAccounts.length === 0) {
      errors.push('被动控制至少需要一个有效账户（包含API Key和Secret Key）')
    }

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])
    setIsSubmitting(true)
    
    try {
      const newTemplate: Template = {
        id: initialData?.id || `template-${Date.now()}-${Math.random()}`,
        name: templateName.trim(),
        activeControl: {
          exchange: activeExchange,
          accounts: validActiveAccounts,
          executionMode: activeExecutionMode,
        },
        passiveControl: {
          exchange: passiveExchange,
          accounts: validPassiveAccounts,
          executionMode: passiveExecutionMode,
        },
      }
      onSave(newTemplate)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formContent = (
    <div className="grid gap-4 py-4">
      {/* 验证错误显示 */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-lg">
          <p className="font-medium mb-2">请修正以下错误：</p>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-sm">{error}</li>
            ))}
          </ul>
        </div>
      )}

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

      <div className="grid md:grid-cols-2 gap-6 mt-4">
        {/* Active Control - 卡片背景在浅色模式下为白色，暗色模式下为深灰色 */}
        <Card className="bg-card text-card-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">主动控制</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="active-exchange">交易所</Label>
              <Select value={activeExchange} onValueChange={setActiveExchange} disabled={exchangesLoading}>
                <SelectTrigger id="active-exchange">
                  <SelectValue placeholder={exchangesLoading ? "加载中..." : "选择交易所"} />
                </SelectTrigger>
                <SelectContent>
                  {exchangesError && (
                    <SelectItem value="" disabled>
                      加载失败，使用默认配置
                    </SelectItem>
                  )}
                  {exchanges.map((exchange) => (
                    <SelectItem key={exchange} value={exchange}>
                      {exchange}
                    </SelectItem>
                  ))}
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
                <Select value={activeExecutionMode} onValueChange={(value) => setActiveExecutionMode(value as "loop" | "random")}>
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
              <Select value={passiveExchange} onValueChange={setPassiveExchange} disabled={exchangesLoading}>
                <SelectTrigger id="passive-exchange">
                  <SelectValue placeholder={exchangesLoading ? "加载中..." : "选择交易所"} />
                </SelectTrigger>
                <SelectContent>
                  {exchangesError && (
                    <SelectItem value="" disabled>
                      加载失败，使用默认配置
                    </SelectItem>
                  )}
                  {exchanges.map((exchange) => (
                    <SelectItem key={exchange} value={exchange}>
                      {exchange}
                    </SelectItem>
                  ))}
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
                <Select value={passiveExecutionMode} onValueChange={(value) => setPassiveExecutionMode(value as "loop" | "random")}>
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
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary text-primary-foreground">
              {isSubmitting ? "保存中..." : "保存"}
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
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary text-primary-foreground">
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
