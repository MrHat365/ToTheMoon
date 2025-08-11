"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Play, StopCircle } from "lucide-react"
import TemplateDialog from "@/components/template-dialog"
import { useRouter } from "next/navigation"

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
  runningStatus: "running" | "stopped"
  activeControl: ControlConfig
  passiveControl: ControlConfig
}

export default function TemplateManagementPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: "1",
      name: "BTC-USDT Strategy",
      status: "enabled",
      runningStatus: "running",
      activeControl: {
        exchange: "Binance",
        accounts: [{ id: "acc1", name: "Binance Main", apiKey: "key1", secretKey: "sec1", passphrase: "pass1" }],
        executionMode: "loop",
      },
      passiveControl: {
        exchange: "Coinbase",
        accounts: [{ id: "acc2", name: "Coinbase Sub", apiKey: "key2", secretKey: "sec2", passphrase: "pass2" }],
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
        accounts: [{ id: "acc3", name: "Kraken Spot", apiKey: "key3", secretKey: "sec3", passphrase: "pass3" }],
        executionMode: "random",
      },
      passiveControl: {
        exchange: "Binance",
        accounts: [{ id: "acc4", name: "Binance Futures", apiKey: "key4", secretKey: "sec4", passphrase: "pass4" }],
        executionMode: "loop",
      },
    },
  ])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  const handleNewTemplate = () => {
    setEditingTemplate(null)
    setIsDialogOpen(true)
  }

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template)
    setIsDialogOpen(true)
  }

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id))
  }

  const handleSaveTemplate = (template: Template) => {
    if (editingTemplate) {
      setTemplates(templates.map((t) => (t.id === template.id ? template : t)))
    } else {
      setTemplates([...templates, { ...template, id: String(templates.length + 1), runningStatus: "stopped" }])
    }
    setIsDialogOpen(false)
  }

  const handleControlTemplate = (templateId: string) => {
    router.push(`/control-center?templateId=${templateId}`)
  }

  const toggleRunningStatus = (id: string) => {
    setTemplates(
      templates.map((template) =>
        template.id === id
          ? { ...template, runningStatus: template.runningStatus === "running" ? "stopped" : "running" }
          : template,
      ),
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <Button onClick={handleNewTemplate} className="bg-primary text-primary-foreground">
          新建模板
        </Button>
      </div>

      {/* 表格容器背景在浅色模式下为白色，暗色模式下为深灰色 */}
      <div className="bg-card text-card-foreground rounded-lg shadow-sm overflow-hidden border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>模板名称</TableHead>
              <TableHead>模板状态</TableHead>
              <TableHead>运行状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>
                  <Badge variant={template.status === "enabled" ? "default" : "destructive"}>
                    {template.status === "enabled" ? "开启" : "关闭"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={template.runningStatus === "running" ? "success" : "secondary"}>
                    {template.runningStatus === "running" ? "运行中" : "已停止"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleEditTemplate(template)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">编辑</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">删除</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleControlTemplate(template.id)}>
                      <Play className="h-4 w-4" />
                      <span className="sr-only">控制</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => toggleRunningStatus(template.id)}>
                      {template.runningStatus === "running" ? (
                        <StopCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Play className="h-4 w-4 text-primary" />
                      )}
                      <span className="sr-only">{template.runningStatus === "running" ? "停止" : "启动"}</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TemplateDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveTemplate}
        initialData={editingTemplate}
      />
    </div>
  )
}
