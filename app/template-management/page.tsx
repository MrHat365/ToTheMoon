"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Loader2 } from "lucide-react"
import TemplateDialog from "@/components/template-dialog"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

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


export default function TemplateManagementPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
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

  // 页面加载时获取数据
  useEffect(() => {
    fetchTemplates()
  }, [])

  const handleNewTemplate = () => {
    setEditingTemplate(null)
    setIsDialogOpen(true)
  }

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template)
    setIsDialogOpen(true)
  }

  // 删除模板
  const handleDeleteTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // 删除成功，从本地状态中移除
        setTemplates(templates.filter((t) => t.id !== id))
        toast({
          variant: "success",
          title: "删除成功",
          description: "模板已成功删除"
        })
      } else {
        setError(data.error || '删除模板失败')
        toast({
          variant: "destructive",
          title: "删除失败",
          description: data.error || '删除模板失败，请稍后重试'
        })
      }
    } catch (error) {
      console.error('删除模板失败:', error)
      setError('删除模板失败，请稍后重试')
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "删除模板失败，请检查网络连接后重试"
      })
    }
  }

  // 保存模板（创建或更新）
  const handleSaveTemplate = async (template: Template) => {
    try {
      const isEditing = !!editingTemplate
      const url = isEditing ? `/api/templates/${editingTemplate.id}` : '/api/templates'
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      })
      
      const data = await response.json()
      
      if (data.success) {
        // 操作成功，重新获取数据
        await fetchTemplates()
        setIsDialogOpen(false)
        setError(null)
        toast({
          variant: "success",
          title: isEditing ? "更新成功" : "创建成功",
          description: isEditing ? "模板已成功更新" : "新模板已成功创建"
        })
      } else {
        setError(data.error || '保存模板失败')
        toast({
          variant: "destructive",
          title: "保存失败",
          description: data.error || '保存模板失败，请稍后重试'
        })
      }
    } catch (error) {
      console.error('保存模板失败:', error)
      setError('保存模板失败，请稍后重试')
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "保存模板失败，请检查网络连接后重试"
      })
    }
  }

  const handleControlTemplate = (templateId: string) => {
    router.push(`/control-center?templateId=${templateId}`)
  }



  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <Button onClick={handleNewTemplate} className="bg-primary text-primary-foreground">
          新建模板
        </Button>
      </div>


      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 text-destructive hover:text-destructive/80"
            onClick={() => setError(null)}
          >
            ✕
          </Button>
        </div>
      )}

      {/* 加载状态 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>加载中...</span>
        </div>
      ) : (
        <div className="bg-card text-card-foreground rounded-lg shadow-sm overflow-hidden border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>模板名称</TableHead>
              <TableHead>主控交易所</TableHead>
              <TableHead>主控账户数量</TableHead>
              <TableHead>被控交易所</TableHead>
              <TableHead>被控账户数量</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {template.activeControl.exchange}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                    {template.activeControl.accounts.length} 个账户
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {template.passiveControl.exchange}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                    {template.passiveControl.accounts.length} 个账户
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
                    <Button variant="default" size="sm" onClick={() => handleControlTemplate(template.id)}>
                      执行
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}

      <TemplateDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveTemplate}
        initialData={editingTemplate}
      />
    </div>
  )
}
