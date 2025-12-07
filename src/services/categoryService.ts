import { supabase } from '@/lib/supabase'
import type { Category } from '@/types'

export const categoryService = {
  async getAllCategories(vendorId?: string): Promise<Category[]> {
    let query = supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false })

    if (vendorId) {
      query = query.eq('vendor_id', vendorId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  },

  async getCategoryById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async uploadCategoryImage(categoryId: string, file: File): Promise<string> {
    const fileName = `${categoryId}-${Date.now()}`
    const { error: uploadError } = await supabase.storage
      .from('category-images')
      .upload(fileName, file, {
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('category-images')
      .getPublicUrl(fileName)

    return data.publicUrl
  },
}
