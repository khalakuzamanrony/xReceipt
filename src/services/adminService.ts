import { supabase } from '@/lib/supabase'
import type { User, AdminPermissions } from '@/types'

export const adminService = {
  // Get all admins
  async getAllAdmins(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Get admin by ID
  async getAdminById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  // Get admin by email (used for auth mapping)
  async getAdminByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  // Get admin permissions
  async getAdminPermissions(adminId: string): Promise<AdminPermissions | null> {
    const { data, error } = await supabase
      .from('admin_permissions')
      .select('*')
      .eq('admin_id', adminId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  // Create new admin
  async createAdmin(
    name: string,
    email: string,
    phone?: string,
    profileImageUrl?: string
  ): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        profile_image_url: profileImageUrl,
        role: 'admin',
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update admin
  async updateAdmin(
    id: string,
    updates: Partial<User>
  ): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete admin
  async deleteAdmin(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Create or update admin permissions
  async saveAdminPermissions(
    adminId: string,
    permissions: Omit<AdminPermissions, 'id' | 'admin_id' | 'created_at' | 'updated_at'>
  ): Promise<AdminPermissions> {
    const existingPermissions = await this.getAdminPermissions(adminId)

    if (existingPermissions) {
      // Update existing
      const { data, error } = await supabase
        .from('admin_permissions')
        .update({
          ...permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('admin_id', adminId)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Create new
      const { data, error } = await supabase
        .from('admin_permissions')
        .insert({
          admin_id: adminId,
          ...permissions,
        })
        .select()
        .single()

      if (error) throw error
      return data
    }
  },

  // Upload profile image to storage
  async uploadProfileImage(
    adminId: string,
    file: File
  ): Promise<string> {
    try {
      const fileName = `${adminId}-${Date.now()}`
      const { error: uploadError } = await supabase.storage
        .from('admin-profiles')
        .upload(fileName, file, {
          upsert: true,
        })

      if (uploadError) {
        console.warn('Storage upload failed:', uploadError)
        // Return empty string if upload fails - allow form to continue
        return ''
      }

      const { data } = supabase.storage
        .from('admin-profiles')
        .getPublicUrl(fileName)

      return data.publicUrl
    } catch (error) {
      console.warn('Image upload error:', error)
      // Return empty string if upload fails - allow form to continue
      return ''
    }
  },
}
