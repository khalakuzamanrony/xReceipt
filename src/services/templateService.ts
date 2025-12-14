import { supabase } from '@/lib/supabase'
import type { ReceiptTemplate } from '@/types'
import { adminService } from '@/services/adminService'

export const templateService = {
  async getAllTemplates(vendorId?: string): Promise<ReceiptTemplate[]> {
    // When no vendor filter is provided, return all templates as before.
    if (!vendorId) {
      const { data, error } = await supabase
        .from('receipt_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    }

    // With a vendor filter, include both templates whose primary vendor_id
    // matches AND any templates explicitly assigned to this vendor via the
    // receipt_template_vendors join table.

    const { data: primary, error: primaryError } = await supabase
      .from('receipt_templates')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })

    if (primaryError) throw primaryError

    const { data: assignmentRows, error: assignmentError } = await supabase
      .from('receipt_template_vendors')
      .select('template_id')
      .eq('vendor_id', vendorId)

    if (assignmentError) throw assignmentError

    const assignedIds = (assignmentRows || []).map((row: any) => row.template_id as string)

    if (!assignedIds.length) {
      return (primary as ReceiptTemplate[]) || []
    }

    const { data: extra, error: extraError } = await supabase
      .from('receipt_templates')
      .select('*')
      .in('id', assignedIds)

    if (extraError) throw extraError

    const byId = new Map<string, ReceiptTemplate>()
    ;(primary || []).forEach((tpl: any) => {
      if (tpl && tpl.id) {
        byId.set(tpl.id as string, tpl as ReceiptTemplate)
      }
    })
    ;(extra || []).forEach((tpl: any) => {
      if (tpl && tpl.id) {
        byId.set(tpl.id as string, tpl as ReceiptTemplate)
      }
    })

    const merged = Array.from(byId.values())

    // Keep newest templates first, similar to the original order.
    merged.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at as any).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at as any).getTime() : 0
      return bTime - aTime
    })

    return merged
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

  async createTemplate(
    template: Omit<ReceiptTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'> & { created_by?: string },
  ): Promise<ReceiptTemplate> {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    let createdBy: string | null = template.created_by ?? null

    // Map Supabase Auth user -> internal users table by email so the foreign key
    // receipt_templates.created_by references users.id, not auth.users.id.
    if (!createdBy && authUser?.email) {
      try {
        const dbUser = await adminService.getAdminByEmail(authUser.email)
        if (dbUser) {
          createdBy = dbUser.id
        }
      } catch (lookupError) {
        console.error('Failed to resolve app user for template created_by:', lookupError)
        createdBy = null
      }
    }

    const { data, error } = await supabase
      .from('receipt_templates')
      .insert({
        ...template,
        created_by: createdBy,
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
