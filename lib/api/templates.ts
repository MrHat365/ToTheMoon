// API客户端 - 模板管理

export interface TemplateData {
  id?: string
  name: string
  status: 'enabled' | 'disabled'
  runningStatus?: 'running' | 'stopped'
  symbol: string
  activeControl: {
    exchange: string
    accounts: Array<{
      name: string
      apiKey: string
      secretKey: string
      passphrase: string
    }>
    executionMode: 'loop' | 'random'
  }
  passiveControl: {
    exchange: string
    accounts: Array<{
      name: string
      apiKey: string
      secretKey: string
      passphrase: string
    }>
    executionMode: 'loop' | 'random'
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class TemplateAPI {
  private baseUrl = '/api/templates'

  async getAllTemplates(): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(this.baseUrl)
      return await response.json()
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async getTemplate(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`)
      return await response.json()
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async createTemplate(templateData: TemplateData): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      })
      return await response.json()
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async updateTemplate(id: string, templateData: Partial<TemplateData>): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      })
      return await response.json()
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async deleteTemplate(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      })
      return await response.json()
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async updateTemplateStatus(id: string, status: 'enabled' | 'disabled'): Promise<ApiResponse<any>> {
    return this.updateTemplate(id, { status })
  }

  async updateRunningStatus(id: string, runningStatus: 'running' | 'stopped'): Promise<ApiResponse<any>> {
    return this.updateTemplate(id, { runningStatus })
  }
}

export const templateAPI = new TemplateAPI()