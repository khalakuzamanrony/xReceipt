import { supabase } from '@/lib/supabase'
import type { ReceiptTemplateVendor } from '@/types'

export const templateVendorService = {
  async getAssignmentsForTemplates(templateIds: string[]): Promise<ReceiptTemplateVendor[]> {
    if (!templateIds.length) return []

    const { data, error } = await supabase
      .from('receipt_template_vendors')
      .select('*')
      .in('template_id', templateIds)

    if (error) throw error
    return data || []
  },

  async setVendorsForTemplate(templateId: string, vendorIds: string[]): Promise<ReceiptTemplateVendor[]> {
    // Replace all existing assignments for this template with the provided vendorIds
    const { error: deleteError } = await supabase
      .from('receipt_template_vendors')
      .delete()
      .eq('template_id', templateId)

    if (deleteError) throw deleteError

    if (!vendorIds.length) {
      return []
    }

    const insertPayload = vendorIds.map((vendorId) => ({
      template_id: templateId,
      vendor_id: vendorId,
    }))

    const { data, error: insertError } = await supabase
      .from('receipt_template_vendors')
      .insert(insertPayload)
      .select('*')

    if (insertError) throw insertError
    return data || []
  },
}
