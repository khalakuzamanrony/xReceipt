import { supabase } from '@/lib/supabase'
import type { User, AdminPermissions, AdminVendorPermissions } from '@/types'
import { hashPassword } from '@/contexts/AuthContext'


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
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Get all users (grand users and admins)
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['grand_user', 'admin', 'super_admin'])
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

  async sendPasswordResetEmail(): Promise<void> {
    // Custom auth doesn't support password reset email
    // This would need a custom implementation with email service
    throw new Error('Password reset not implemented for custom authentication')
  },

  // Reset password for a user (grand user can reset any, super user can reset self and admins under them)
  async resetPassword(
    targetUserId: string,
    currentUserId: string,
    currentUserRole: string,
    newPassword: string
  ): Promise<void> {
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword)

    // Get target user info
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, role, email')
      .eq('id', targetUserId)
      .single()

    if (targetError) throw new Error('Target user not found')

    // Permission checks
    if (currentUserRole === 'grand_user') {
      // Grand user can reset password for any user
      // No additional checks needed
    } else if (currentUserRole === 'super_admin') {
      // Super admin can only reset:
      // 1. Their own password
      // 2. Admin passwords (if they manage them)
      if (targetUserId !== currentUserId && targetUser.role !== 'admin') {
        throw new Error('Super admin can only reset their own password or admin passwords')
      }
    } else {
      throw new Error('Insufficient permissions to reset password')
    }

    // Update the password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)

    if (updateError) {
      throw new Error(`Failed to reset password: ${updateError.message}`)
    }
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
    role: 'admin' | 'super_admin' = 'admin',
  ): Promise<User> {
    const passwordHash = password ? await hashPassword(password) : undefined

    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        profile_image_url: profileImageUrl,
        role,
        password_hash: passwordHash,
      })
      .select()
      .single()

    if (error) throw error
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
    const passwordHash = password ? await hashPassword(password) : undefined

    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        profile_image_url: profileImageUrl,
        role: 'grand_user',
        password_hash: passwordHash,
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

  // Delete admin (simple deletion from users table only)
  async deleteAdmin(
    id: string,
  ): Promise<{ storageDeleted: boolean; storageError: string | null; dbDeleted: boolean }> {
    try {
      let storageDeleted = true
      let storageError: string | null = null

      // Try to delete profile image from storage if exists
      try {
        const { data: userRow, error: userError } = await supabase
          .from('users')
          .select('profile_image_url')
          .eq('id', id)
          .maybeSingle()
        if (!userError && userRow?.profile_image_url) {
          const path = resolveAdminProfileStoragePath(userRow.profile_image_url)
          if (path) {
            const { error: removeError } = await supabase.storage.from('admin-profiles').remove([path])
            if (removeError) {
              storageDeleted = false
              storageError = removeError.message || String(removeError)
            }
          }
        }
      } catch (storageErr) {
        storageDeleted = false
        storageError = storageErr instanceof Error ? storageErr.message : String(storageErr)
      }

      // Delete from users table
      const { error: deleteDbError } = await supabase.from('users').delete().eq('id', id)
      if (deleteDbError) {
        throw new Error(`Failed to delete user from database: ${deleteDbError.message}`)
      }

      return { storageDeleted, storageError, dbDeleted: true }
    } catch (err) {
      throw err
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
