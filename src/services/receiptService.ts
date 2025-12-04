import { supabase } from '@/lib/supabase'
import type { Receipt } from '@/types'

export const receiptService = {
  async getAllReceipts(): Promise<Receipt[]> {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getReceiptById(id: string): Promise<Receipt | null> {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async createReceipt(receipt: Omit<Receipt, 'id' | 'receipt_number' | 'created_at' | 'updated_at' | 'status'>): Promise<Receipt> {
    // Generate receipt number: REC-YYYYMMDD-HHMMSS-RANDOM
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '')
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const receipt_number = `REC-${dateStr}-${timeStr}-${random}`

    const { data, error } = await supabase
      .from('receipts')
      .insert({
        ...receipt,
        receipt_number,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateReceipt(id: string, updates: Partial<Receipt>): Promise<Receipt> {
    const { data, error } = await supabase
      .from('receipts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteReceipt(id: string): Promise<void> {
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async updateReceiptStatus(id: string, status: 'draft' | 'sent' | 'paid'): Promise<Receipt> {
    const { data, error } = await supabase
      .from('receipts')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },
}
