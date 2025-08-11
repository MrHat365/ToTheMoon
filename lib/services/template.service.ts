// 简化的模板服务
import { SimpleRepository } from '@/lib/database'

export class TemplateService {
  private templatesRepo = new SimpleRepository('templates')

  async updateTimedTaskConfig(templateId: string, controlType: 'active' | 'passive', config: any) {
    try {
      const template = await this.templatesRepo.findById(templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      // 更新对应控制类型的配置
      if (controlType === 'active') {
        template.activeControl = { ...template.activeControl, ...config }
      } else {
        template.passiveControl = { ...template.passiveControl, ...config }
      }

      const updated = await this.templatesRepo.updateById(templateId, template)
      return updated
    } catch (error: any) {
      throw new Error(`Failed to update config: ${error.message}`)
    }
  }

  async getTemplate(id: string) {
    return await this.templatesRepo.findById(id)
  }

  async getAllTemplates() {
    return await this.templatesRepo.findAll()
  }

  async createTemplate(templateData: any) {
    return await this.templatesRepo.create(templateData)
  }

  async updateTemplate(id: string, templateData: any) {
    return await this.templatesRepo.updateById(id, templateData)
  }

  async deleteTemplate(id: string) {
    return await this.templatesRepo.deleteById(id)
  }
}