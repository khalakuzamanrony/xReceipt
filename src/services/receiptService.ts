import { supabase } from '@/lib/supabase'
import type { Receipt, ReceiptItem } from '@/types'

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
    
    if (!data) return null

    // Fetch receipt items
    const { data: items, error: itemsError } = await supabase
      .from('receipt_items')
      .select('*')
      .eq('receipt_id', id)
      .order('created_at', { ascending: true })

    if (itemsError) throw itemsError

    return {
      ...data,
      items: items || [],
    }
  },

  async createReceipt(receipt: Omit<Receipt, 'id' | 'receipt_number' | 'created_at' | 'updated_at' | 'status'>): Promise<Receipt> {
    // Generate receipt number: REC-YYYYMMDD-HHMMSS-RANDOM
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '')
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const receipt_number = `REC-${dateStr}-${timeStr}-${random}`

    // Extract items from receipt data
    const { items, ...receiptData } = receipt

    const { data, error } = await supabase
      .from('receipts')
      .insert({
        ...receiptData,
        receipt_number,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error

    // Insert receipt items if provided
    if (items && items.length > 0) {
      const receiptItems = items.map(item => ({
        receipt_id: data.id,
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }))

      const { error: itemsError } = await supabase
        .from('receipt_items')
        .insert(receiptItems)

      if (itemsError) throw itemsError
    }

    return {
      ...data,
      items: items || [],
    }
  },

  async updateReceipt(id: string, updates: Partial<Receipt>): Promise<Receipt> {
    // Extract items from updates if provided
    const { items, ...receiptUpdates } = updates

    const { data, error } = await supabase
      .from('receipts')
      .update(receiptUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Update receipt items if provided
    if (items !== undefined) {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('receipt_items')
        .delete()
        .eq('receipt_id', id)

      if (deleteError) throw deleteError

      // Insert new items
      if (items.length > 0) {
        const receiptItems = items.map(item => ({
          receipt_id: id,
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }))

        const { error: itemsError } = await supabase
          .from('receipt_items')
          .insert(receiptItems)

        if (itemsError) throw itemsError
      }
    }

    // Fetch updated receipt with items
    return this.getReceiptById(id) as Promise<Receipt>
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
