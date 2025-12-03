import { useState, useEffect } from 'react'
import type { User, AdminPermissions } from '@/types'
import { adminService } from '@/services/adminService'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import ProductAccessGroup from './permissions/ProductAccessGroup'
import CategoryAccessGroup from './permissions/CategoryAccessGroup'
import ReceiptAccessGroup from './permissions/ReceiptAccessGroup'
import TemplateAccessGroup from './permissions/TemplateAccessGroup'

interface AdminFormProps {
  admin: User | null
  onClose: () => void
}

export default function AdminForm({ admin, onClose }: AdminFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    profileImage: null as File | null,
  })

  const [permissions, setPermissions] = useState<Partial<AdminPermissions>>({
    can_view_products: false,
    can_create_products: false,
    assigned_product_ids: [],
    can_view_categories: false,
    can_create_categories: false,
    can_assign_categories: false,
    assigned_category_ids: [],
    can_view_receipts: false,
    can_create_receipts: false,
    can_assign_receipt_templates: false,
    can_view_templates: false,
    can_create_templates: false,
    can_assign_templates: false,
    assigned_template_ids: [],
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name,
        email: admin.email,
        phone: admin.phone || '',
        profileImage: null,
      })
      loadPermissions(admin.id)
    }
  }, [admin])

  const loadPermissions = async (adminId: string) => {
    try {
      const perms = await adminService.getAdminPermissions(adminId)
      if (perms) {
        setPermissions(perms)
      }
    } catch (err) {
      console.error('Failed to load permissions:', err)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFormData(prev => ({ ...prev, profileImage: e.target.files![0] }))
    }
  }

  const handlePermissionChange = (key: string, value: any) => {
    setPermissions(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setWarning(null)

    try {
      let profileImageUrl = admin?.profile_image_url

      // Upload image if provided
      if (formData.profileImage) {
        profileImageUrl = await adminService.uploadProfileImage(
          admin?.id || 'new',
          formData.profileImage
        )
        if (!profileImageUrl) {
          setWarning('Image upload failed. Admin saved without profile image. Create storage buckets to enable image uploads.')
        }
      }

      if (admin) {
        // Update existing admin
        await adminService.updateAdmin(admin.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          profile_image_url: profileImageUrl,
        })
      } else {
        // Create new admin
        const newAdmin = await adminService.createAdmin(
          formData.name,
          formData.email,
          formData.phone,
          profileImageUrl
        )

        // Save permissions for new admin
        await adminService.saveAdminPermissions(newAdmin.id, permissions as any)
        onClose()
        return
      }

      // Save permissions for existing admin
      if (admin) {
        await adminService.saveAdminPermissions(admin.id, permissions as any)
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save admin')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {admin ? 'Edit Admin' : 'Create New Admin'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {warning && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
              {warning}
            </div>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Admin name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={!!admin}
                    placeholder="admin@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Profile Image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProductAccessGroup
                permissions={permissions}
                onChange={handlePermissionChange}
              />

              <CategoryAccessGroup
                permissions={permissions}
                onChange={handlePermissionChange}
              />

              <ReceiptAccessGroup
                permissions={permissions}
                onChange={handlePermissionChange}
              />

              <TemplateAccessGroup
                permissions={permissions}
                onChange={handlePermissionChange}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Admin'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
