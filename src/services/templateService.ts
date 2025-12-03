import { supabase } from '@/lib/supabase'
import type { ReceiptTemplate } from '@/types'

export const templateService = {
  async getAllTemplates(): Promise<ReceiptTemplate[]> {
    const { data, error } = await supabase
      .from('receipt_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getTemplateById(id: string): Promise<ReceiptTemplate | null> {
    const { data, error } = await supabase
      .from('receipt_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async createTemplate(template: Omit<ReceiptTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ReceiptTemplate> {
    const { data, error } = await supabase
      .from('receipt_templates')
      .insert(template)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateTemplate(id: string, updates: Partial<ReceiptTemplate>): Promise<ReceiptTemplate> {
    const { data, error } = await supabase
      .from('receipt_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('receipt_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
