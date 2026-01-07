import { supabase } from '@/lib/supabase'
import type { Receipt } from '@/types'
import { vendorService } from '@/services/vendorService'

export const receiptService = {
  async getAllReceipts(vendorId?: string): Promise<Receipt[]> {
    let query = supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false })

    if (vendorId) {
      query = query.eq('vendor_id', vendorId)
    }

    const { data, error } = await query

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
    // Extract items from receipt data
    const { items, ...receiptData } = receipt

    const vendorId = (receiptData as any).vendor_id as string | null | undefined

    const buildPrefixFromVendorName = (nameRaw: string | null | undefined) => {
      const name = (nameRaw || '').trim()
      if (!name) return 'RC'

      const safe = name
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, ' ')
        .trim()

      const parts = safe.split(/\s+/).filter(Boolean)

      const firstInitial = parts[0]?.[0]
      const secondInitial = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]

      const a = firstInitial && /[A-Z]/.test(firstInitial) ? firstInitial : 'R'
      const b = secondInitial && /[A-Z]/.test(secondInitial) ? secondInitial : 'C'

      return `${a}${b}`
    }

    const getReceiptNumberContext = async () => {
      if (!vendorId) {
        return { prefix: 'RC', baseSeq: Math.floor(Math.random() * 1_000_0000) }
      }

      let prefix = 'RC'
      try {
        const vendor = await vendorService.getVendorById(vendorId)
        prefix = buildPrefixFromVendorName(vendor?.name)
      } catch {
        // Keep default prefix
      }

      // Find the max suffix currently used for this shop+prefix.
      // We scan a small recent set to be robust with legacy formats like "AB-0001".
      const { data: rows, error: lastError } = await supabase
        .from('receipts')
        .select('receipt_number')
        .eq('vendor_id', vendorId)
        .ilike('receipt_number', `${prefix}-%`)
        .order('receipt_number', { ascending: false })
        .limit(50)

      if (lastError) throw lastError

      let maxSeq = 0
      for (const row of rows || []) {
        const value = (row as any)?.receipt_number
        if (typeof value !== 'string') continue
        const parts = value.split('-')
        if (parts.length !== 2) continue
        if (parts[0] !== prefix) continue
        if (!/^\d+$/.test(parts[1])) continue
        const seq = Number(parts[1]) || 0
        if (seq > maxSeq) maxSeq = seq
      }

      return { prefix, baseSeq: maxSeq }
    }

    const buildReceiptNumberFromContext = (ctx: { prefix: string; baseSeq: number }, offset: number) => {
      const nextSeq = ctx.baseSeq + 1 + offset
      if (nextSeq > 9_999_999) {
        throw new Error('Receipt number limit reached for this shop prefix')
      }
      const suffix = nextSeq.toString().padStart(7, '0')
      return `${ctx.prefix}-${suffix}`
    }

    const ctx = await getReceiptNumberContext()

    const tryInsert = async (attempt: number): Promise<any> => {
      const receipt_number = buildReceiptNumberFromContext(ctx, attempt)
      const { data, error } = await supabase
        .from('receipts')
        .insert({
          ...receiptData,
          receipt_number,
          status: 'draft',
        })
        .select()
        .single()

      if (!error) return data

      // Unique constraint violation (receipt_number is unique)
      // Postgres error code: 23505
      if ((error as any)?.code === '23505' && attempt < 5) {
        return tryInsert(attempt + 1)
      }

      throw error
    }

    const data = await tryInsert(0)

    // Insert receipt items if provided
    if (items && items.length > 0) {
      const receiptItems = items.map(item => ({
        receipt_id: data.id,
        product_id: item.product_id,
        name: item.name,
        imei_or_model: item.imei_or_model ?? null,
        color: item.color ?? null,
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

    const { error } = await supabase
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
          imei_or_model: item.imei_or_model ?? null,
          color: item.color ?? null,
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

  async sendReceiptEmail(id: string, email: string): Promise<void> {
    const { error } = await supabase.functions.invoke('send-receipt-email', {
      body: { receiptId: id, email },
    })

    if (error) throw error
  },
}
