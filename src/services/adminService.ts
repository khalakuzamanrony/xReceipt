import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import type { User, AdminPermissions, Vendor } from '@/types'

const authProvisionClient = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: 'sb-provision-auth-token',
    },
  },
)

async function ensureAuthUser(email: string, password: string) {
  if (!email || !password) return

  const { error } = await authProvisionClient.auth.signUp({
    email,
    password,
  })

  if (error) {
    const message = String(error.message || '').toLowerCase()
    // Ignore if user already exists; this makes the operation idempotent
    if (!message.includes('already registered') && !message.includes('user already exists')) {
      throw error
    }
  }
}

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

  // Get all users (grand users and admins)
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['grand_user', 'admin'])
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

  async sendPasswordResetEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    if (error) throw error
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
    profileImageUrl?: string,
    password?: string,
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

    if (password) {
      try {
        await ensureAuthUser(email, password)
      } catch (authError) {
        console.error('Failed to create Supabase Auth user for admin:', authError)
        const message = authError instanceof Error ? authError.message : 'Failed to create Supabase Auth user for admin'
        // Surface this so the UI can tell the user why login might fail
        throw new Error(message)
      }
    }

    return data
  },

  // Create new grand user
  async createGrandUser(
    name: string,
    email: string,
    phone?: string,
    profileImageUrl?: string,
    password?: string,
  ): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        profile_image_url: profileImageUrl,
        role: 'grand_user',
      })
      .select()
      .single()

    if (error) throw error

    if (password) {
      try {
        await ensureAuthUser(email, password)
      } catch (authError) {
        console.error('Failed to create Supabase Auth user for grand user:', authError)
        const message =
          authError instanceof Error
            ? authError.message
            : 'Failed to create Supabase Auth user for grand user'
        throw new Error(message)
      }
    }

    return data
  },

  // Create a full-permission vendor super admin for a specific vendor
  async createVendorSuperAdminForVendor(vendor: Vendor, passwordOverride?: string): Promise<User> {
    const base = (vendor.vendor_id || vendor.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
    const safeBase = base || 'shop'

    if (!vendor.email) {
      throw new Error('Vendor email is required to create a vendor super admin')
    }

    const email = vendor.email
    const passwordBase = safeBase.charAt(0).toUpperCase() + safeBase.slice(1)
    const defaultPassword = `#${passwordBase}1`
    const password = passwordOverride || defaultPassword

    const { data, error } = await supabase
      .from('users')
      .insert({
        name: `${vendor.name} Super Admin`,
        email,
        role: 'admin',
      })
      .select()
      .single()

    if (error) throw error

    // Grant full permissions to this vendor super admin by default
    await this.saveAdminPermissions(data.id, {
      can_view_products: true,
      can_create_products: true,
      assigned_product_ids: [],
      can_view_categories: true,
      can_create_categories: true,
      can_assign_categories: true,
      assigned_category_ids: [],
      can_view_receipts: true,
      can_create_receipts: true,
      can_assign_receipt_templates: true,
      can_view_templates: true,
      can_create_templates: true,
      can_assign_templates: true,
      assigned_template_ids: [],
    })

    try {
      await ensureAuthUser(email, password)
    } catch (authError) {
      console.error('Failed to create Supabase Auth user for vendor super admin:', authError)
    }

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

  // Delete admin (blocked if admin is vendor super admin for any vendor)
  async deleteAdmin(id: string): Promise<void> {
    const { data: vendorSuperAdmins, error: vendorSuperError } = await supabase
      .from('vendor_admins')
      .select('id')
      .eq('admin_id', id)
      .eq('is_vendor_super_admin', true)

    if (vendorSuperError) throw vendorSuperError

    if (vendorSuperAdmins && vendorSuperAdmins.length > 0) {
      throw new Error('Cannot delete an admin who is a vendor super admin. Update vendor admin assignments first.')
    }

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
