import { supabase } from '@/lib/supabase'
import type { ReceiptTemplate } from '@/types'

export const templateService = {
  async getAllTemplates(vendorId?: string): Promise<ReceiptTemplate[]> {
    let query = supabase
      .from('receipt_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (vendorId) {
      query = query.eq('vendor_id', vendorId)
    }

    const { data, error } = await query

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

  async createTemplate(template: Omit<ReceiptTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'> & { created_by?: string }): Promise<ReceiptTemplate> {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('receipt_templates')
      .insert({
        ...template,
        created_by: template.created_by || user?.id || null,
      })
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
