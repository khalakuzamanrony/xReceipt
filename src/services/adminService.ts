import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import type { User, AdminPermissions, AdminVendorPermissions, Vendor } from '@/types'

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

function resolveAdminProfileStoragePath(value: string): string {
  if (!value) return ''
  if (value.startsWith('data:')) return ''

  const cleaned = value.split('#')[0].split('?')[0]

  const markers = [
    '/storage/v1/object/public/admin-profiles/',
    '/storage/v1/object/admin-profiles/',
    'admin-profiles/',
  ]

  for (const marker of markers) {
    const idx = cleaned.indexOf(marker)
    if (idx >= 0) {
      return cleaned.slice(idx + marker.length).replace(/^\/+/, '')
    }
  }

  if (!cleaned.startsWith('http') && cleaned.includes('/')) return cleaned.replace(/^\/+/, '')
  return ''
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
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async getAdminVendorPermissions(adminId: string, vendorId: string): Promise<AdminVendorPermissions | null> {
    const { data, error } = await supabase
      .from('admin_vendor_permissions')
      .select('*')
      .eq('admin_id', adminId)
      .eq('vendor_id', vendorId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    return (data as AdminVendorPermissions) || null
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
  async deleteAdmin(
    id: string,
  ): Promise<{ storageDeleted: boolean; storageError: string | null; authDeleted: boolean }> {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: id },
      })

      if (error) throw error

      const payload = (data || {}) as any
      if (payload?.error) {
        throw new Error(String(payload.error))
      }

      return {
        storageDeleted: payload?.storageDeleted ?? true,
        storageError: payload?.storageError ?? null,
        authDeleted: payload?.authDeleted ?? false,
      }
    } catch (err) {
      // If the edge function is not deployed / blocked by CORS / network error,
      // still allow deletion of the app DB row as a fallback.
      const msg = err instanceof Error ? err.message : String(err)
      const lower = msg.toLowerCase()

      const isInvokeTransportError =
        lower.includes('failed to send request') ||
        lower.includes('functionsfetcherror') ||
        lower.includes('fetch')

      if (!isInvokeTransportError) {
        throw err
      }

      let storageDeleted = true
      let storageError: string | null = null

      try {
        const { data: userRow, error: userError } = await supabase
          .from('users')
          .select('profile_image_url')
          .eq('id', id)
          .maybeSingle()
        if (userError) throw userError

        const path = resolveAdminProfileStoragePath(userRow?.profile_image_url || '')
        if (path) {
          const { error: removeError } = await supabase.storage.from('admin-profiles').remove([path])
          if (removeError) {
            storageDeleted = false
            storageError = removeError.message || String(removeError)
          }
        }
      } catch (storageErr) {
        storageDeleted = false
        storageError = storageErr instanceof Error ? storageErr.message : String(storageErr)
      }

      const { error: deleteDbError } = await supabase.from('users').delete().eq('id', id)
      if (deleteDbError) {
        const fallbackMessage =
          'Delete failed because the delete-user edge function is unreachable (CORS / not deployed) and direct database deletion is blocked (likely by RLS). Deploy the Supabase Edge Function "delete-user" and ensure its OPTIONS preflight returns 200 with Access-Control-Allow-Origin for your app origin (e.g. http://localhost:5173), then try again.'
        throw new Error(fallbackMessage)
      }

      // authDeleted is unknown in fallback mode (edge function not executed).
      return { storageDeleted, storageError, authDeleted: false }
    }
  },

  getProfileImageStoragePath(profileImageUrl: string): string {
    return resolveAdminProfileStoragePath(profileImageUrl)
  },

  async deleteProfileImageByPath(path: string): Promise<void> {
    if (!path) return
    const { error } = await supabase.storage.from('admin-profiles').remove([path])
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

  async saveAdminVendorPermissions(
    adminId: string,
    vendorId: string,
    permissions: Omit<AdminPermissions, 'id' | 'admin_id' | 'created_at' | 'updated_at'>,
  ): Promise<AdminVendorPermissions> {
    const existing = await this.getAdminVendorPermissions(adminId, vendorId)

    if (existing) {
      const { data, error } = await supabase
        .from('admin_vendor_permissions')
        .update({
          ...permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('admin_id', adminId)
        .eq('vendor_id', vendorId)
        .select()
        .single()

      if (error) throw error
      return data as AdminVendorPermissions
    }

    const { data, error } = await supabase
      .from('admin_vendor_permissions')
      .insert({
        admin_id: adminId,
        vendor_id: vendorId,
        ...permissions,
      })
      .select()
      .single()

    if (error) throw error
    return data as AdminVendorPermissions
  },

  // Upload profile image to storage
  async uploadProfileImage(
    adminId: string,
    file: File
  ): Promise<{ publicUrl: string; path: string; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const ownerId = user?.id || adminId
      const ext = file.name.includes('.') ? (file.name.split('.').pop() || '') : ''
      const fileName = `${adminId}-${Date.now()}${ext ? `.${ext}` : ''}`
      const path = `${ownerId}/${fileName}`
      const { error: uploadError } = await supabase.storage
        .from('admin-profiles')
        .upload(path, file, {
          upsert: true,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : String(uploadError)
        console.warn('Storage upload failed:', uploadError)
        return { publicUrl: '', path: '', error: message }
      }

      const { data } = supabase.storage
        .from('admin-profiles')
        .getPublicUrl(path)

      return { publicUrl: data.publicUrl, path, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('Image upload error:', error)
      return { publicUrl: '', path: '', error: message }
    }
  },
}
