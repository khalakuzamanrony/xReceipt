import { useEffect, useState } from 'react'
import type { Vendor, User } from '@/types'
import { vendorService } from '@/services/vendorService'
import { vendorAdminService } from '@/services/vendorAdminService'
import { adminService } from '@/services/adminService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Checkbox } from '@/components/ui/Checkbox'
import { Plus, Edit, Trash2, AlertCircle, Store, Search, Eye, EyeOff, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function VendorList() {
  const { role } = useAuth()
  const { memberships, activeVendorId } = useVendor()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [showForm, setShowForm] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [showAdminsDialog, setShowAdminsDialog] = useState(false)
  const [adminsVendor, setAdminsVendor] = useState<Vendor | null>(null)
  const [assignedAdminIds, setAssignedAdminIds] = useState<string[]>([])
  const [superAdminIds, setSuperAdminIds] = useState<string[]>([])
  const [savingAdmins, setSavingAdmins] = useState(false)
  const [vendorAdminAssignments, setVendorAdminAssignments] = useState<
    Record<string, { adminIds: string[]; superAdminIds: string[] }>
  >({})
  const [assignVendorId, setAssignVendorId] = useState<string | null>(null)
  const [assignSearch, setAssignSearch] = useState('')
  const [assignSelectedAdminIds, setAssignSelectedAdminIds] = useState<string[]>([])
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [adminAvatarUrls, setAdminAvatarUrls] = useState<Record<string, string>>({})
  const [brokenAvatarAdminIds, setBrokenAvatarAdminIds] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState({
    vendor_id: '',
    name: '',
    email: '',
    address: '',
    url: '',
    status: 'active' as 'active' | 'inactive',
    admin_id: '',
    image_url: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('')
  const [imageWorking, setImageWorking] = useState(false)
  const [superAdminPassword, setSuperAdminPassword] = useState('')
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false)

  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const handleChange = () => {
      setIsDesktop(mql.matches)
      setAssignVendorId(null)
      setAssignSearch('')
      setAssignSelectedAdminIds([])
      setAssignError(null)
    }

    handleChange()
    mql.addEventListener('change', handleChange)
    return () => {
      mql.removeEventListener('change', handleChange)
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [vendorsData, adminsData] = await Promise.all([
        vendorService.getAllVendors(),
        adminService.getAllAdmins(),
      ])
      setVendors(vendorsData)
      setAdmins(adminsData)

      try {
        const resolveStoragePath = (value: string) => {
          if (!value) return ''
          if (value.startsWith('data:')) return ''
          const markers = [
            '/storage/v1/object/sign/admin-profiles/',
            '/storage/v1/object/public/admin-profiles/',
            '/storage/v1/object/admin-profiles/',
            'admin-profiles/',
          ]

          for (const marker of markers) {
            const idx = value.indexOf(marker)
            if (idx >= 0) {
              const extracted = value.slice(idx + marker.length)
              return extracted.split('?')[0].split('#')[0]
            }
          }

          if (!value.startsWith('http') && value.includes('/')) {
            return value.split('?')[0].split('#')[0]
          }
          return ''
        }

        const entries = adminsData.map((admin) => {
          const raw = admin.profile_image_url || ''
          const path = resolveStoragePath(raw)
          if (!path) return [admin.id, raw] as const
          return [admin.id, path] as const
        })

        const signedEntries = await Promise.all(
          entries.map(async ([adminId, pathOrUrl]) => {
            if (!pathOrUrl) return [adminId, ''] as const
            if ((pathOrUrl || '').startsWith('http')) return [adminId, pathOrUrl] as const

            try {
              const { data, error } = await supabase.storage
                .from('admin-profiles')
                .createSignedUrl(pathOrUrl, 60 * 60)
              if (error || !data?.signedUrl) return [adminId, ''] as const
              return [adminId, data.signedUrl] as const
            } catch {
              return [adminId, ''] as const
            }
          }),
        )

        setAdminAvatarUrls((prev) => ({
          ...prev,
          ...Object.fromEntries(signedEntries.filter(([, url]) => !!url)),
        }))
      } catch (avatarErr) {
        console.warn('Failed to resolve admin avatar URLs:', avatarErr)
      }

      try {
        const vendorIds = vendorsData.map((v) => v.id)
        if (vendorIds.length > 0) {
          const assignments = await vendorAdminService.getAssignmentsForVendors(vendorIds)
          const map: Record<string, { adminIds: string[]; superAdminIds: string[] }> = {}

          for (const row of assignments) {
            if (!map[row.vendor_id]) {
              map[row.vendor_id] = { adminIds: [], superAdminIds: [] }
            }
            if (!map[row.vendor_id].adminIds.includes(row.admin_id)) {
              map[row.vendor_id].adminIds.push(row.admin_id)
            }
            if (row.is_vendor_super_admin && !map[row.vendor_id].superAdminIds.includes(row.admin_id)) {
              map[row.vendor_id].superAdminIds.push(row.admin_id)
            }
          }

          setVendorAdminAssignments(map)
        } else {
          setVendorAdminAssignments({})
        }
      } catch (assignErr) {
        console.error('Failed to load vendor admin assignments', assignErr)
        setVendorAdminAssignments({})
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  const handleManageAdmins = async (vendor: Vendor) => {
    setAdminsVendor(vendor)
    setError(null)
    setSavingAdmins(false)
    try {
      const existing = await vendorAdminService.getAdminsForVendor(vendor.id)
      const assigned = existing.map((va) => va.admin_id)
      const superAssigned = existing
        .filter((va) => va.is_vendor_super_admin)
        .map((va) => va.admin_id)
      setAssignedAdminIds(assigned)
      setSuperAdminIds(superAssigned)
      setShowAdminsDialog(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shop admins')
    }
  }

  const handleToggleAssignedAdmin = (adminId: string, checked: boolean) => {
    if (checked) {
      if (!assignedAdminIds.includes(adminId)) {
        setAssignedAdminIds([...assignedAdminIds, adminId])
      }
    } else {
      setAssignedAdminIds(assignedAdminIds.filter((id) => id !== adminId))
      if (superAdminIds.includes(adminId)) {
        setSuperAdminIds(superAdminIds.filter((id) => id !== adminId))
      }
    }
  }

  const handleToggleSuperAdmin = (adminId: string, checked: boolean) => {
    if (!assignedAdminIds.includes(adminId)) return
    if (checked) {
      if (!superAdminIds.includes(adminId)) {
        setSuperAdminIds([...superAdminIds, adminId])
      }
    } else {
      setSuperAdminIds(superAdminIds.filter((id) => id !== adminId))
    }
  }

  const handleSaveVendorAdmins = async () => {
    if (!adminsVendor) return
    setSavingAdmins(true)
    setError(null)
    try {
      const assignments = assignedAdminIds.map((adminId) => ({
        admin_id: adminId,
        is_vendor_super_admin: superAdminIds.includes(adminId),
      }))
      await vendorAdminService.saveAdminsForVendor(adminsVendor.id, assignments)

      setVendorAdminAssignments((prev) => ({
        ...prev,
        [adminsVendor.id]: {
          adminIds: assignedAdminIds,
          superAdminIds: superAdminIds,
        },
      }))
      setShowAdminsDialog(false)
      setAdminsVendor(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shop admins')
    } finally {
      setSavingAdmins(false)
    }
  }

  const isGrandUser = role === 'grand_user'
  const membershipVendorIds = memberships.map((m) => m.vendor.id)

  const filteredVendors = vendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.vendor_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // First scope vendors based on membership (non-grand users only see their vendors)
  let scopedVendors = isGrandUser
    ? filteredVendors
    : filteredVendors.filter((vendor) => membershipVendorIds.includes(vendor.id))

  // Then, if a specific active vendor is selected in the global header,
  // further narrow the list down to that vendor only.
  if (activeVendorId) {
    scopedVendors = scopedVendors.filter((vendor) => vendor.id === activeVendorId)
  }

  const totalVendors = scopedVendors.length
  const totalPages = Math.max(1, Math.ceil(totalVendors / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedVendors = scopedVendors.slice(startIndex, startIndex + rowsPerPage)

  const handleAddNew = () => {
    setSelectedVendor(null)
    setFormData({
      vendor_id: '',
      name: '',
      email: '',
      address: '',
      url: '',
      status: 'active',
      admin_id: '',
      image_url: '',
    })
    setImageFile(null)
    setImagePreviewUrl('')
    setSuperAdminPassword('')
    setShowForm(true)
  }

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setFormData({
      vendor_id: vendor.vendor_id,
      name: vendor.name,
      email: vendor.email,
      address: vendor.address || '',
      url: vendor.url || '',
      status: vendor.status,
      admin_id: vendor.admin_id || '',
      image_url: vendor.image_url || '',
    })
    setImageFile(null)
    setImagePreviewUrl(vendor.image_url || '')
    setSuperAdminPassword('')
    setShowForm(true)
  }

  const handleDelete = async (vendor: Vendor) => {
    if (!confirm('Are you sure you want to delete this shop?')) return

    try {
      const result = await vendorService.deleteVendorWithImage(vendor.id, vendor.image_url)
      setVendors(vendors.filter(v => v.id !== vendor.id))

      if (!result.storageDeleted) {
        setError(
          result.storageError
            ? `Shop deleted, but the image could not be deleted from storage: ${result.storageError}`
            : 'Shop deleted, but the image could not be deleted from storage.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete shop')
    }
  }

  const handleImageChange = (file: File | null) => {
    setImageFile(file)

    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    if (!file) {
      setImagePreviewUrl(selectedVendor?.image_url || formData.image_url || '')
      return
    }

    setImagePreviewUrl(URL.createObjectURL(file))
  }

  const handleRemoveImage = async () => {
    if (!selectedVendor?.id) return
    if (!selectedVendor.image_url) {
      setFormData((prev) => ({ ...prev, image_url: '' }))
      setImageFile(null)
      setImagePreviewUrl('')
      return
    }

    try {
      setImageWorking(true)
      setError(null)
      const result = await vendorService.deleteVendorImage(selectedVendor.image_url)
      if (!result.deleted) {
        setError(
          result.error
            ? `Failed to delete shop image from storage: ${result.error}`
            : 'Failed to delete shop image from storage.',
        )
        return
      }

      const updated = await vendorService.updateVendor(selectedVendor.id, { image_url: null })
      setSelectedVendor(updated)
      setFormData((prev) => ({ ...prev, image_url: '' }))
      setImageFile(null)
      setImagePreviewUrl('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove shop image')
    } finally {
      setImageWorking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.vendor_id || !formData.name || !formData.email) {
      setError('Shop ID, name, and email are required')
      return
    }

    if (!selectedVendor && !superAdminPassword) {
      setError('Please provide a password for the shop super admin')
      return
    }

    try {
      const payload = {
        vendor_id: formData.vendor_id,
        name: formData.name,
        email: formData.email,
        address: formData.address || null,
        url: formData.url || null,
        status: formData.status,
        image_url: formData.image_url || null,
        admin_id: formData.admin_id || null,
      }

      if (selectedVendor) {
        let nextImageUrl = payload.image_url
        const oldImageUrl = selectedVendor.image_url || null

        if (imageFile) {
          setImageWorking(true)
          const upload = await vendorService.uploadVendorImage(selectedVendor.id, imageFile)
          nextImageUrl = upload.publicUrl
        }

        const updatedVendor = await vendorService.updateVendor(selectedVendor.id, {
          ...payload,
          image_url: nextImageUrl,
        })

        if (imageFile && oldImageUrl && nextImageUrl && oldImageUrl !== nextImageUrl) {
          try {
            await vendorService.deleteVendorImage(oldImageUrl)
          } catch {
            // ignore
          }
        }

        setSelectedVendor(updatedVendor)
      } else {
        const createdVendor = await vendorService.createVendor({
          ...(payload as any),
          image_url: null,
        })

        if (imageFile) {
          setImageWorking(true)
          try {
            const upload = await vendorService.uploadVendorImage(createdVendor.id, imageFile)
            await vendorService.updateVendor(createdVendor.id, { image_url: upload.publicUrl })
          } catch (uploadErr) {
            const message = uploadErr instanceof Error ? uploadErr.message : String(uploadErr)
            console.error('Vendor image upload failed after vendor creation', uploadErr)
            setSelectedVendor(createdVendor)
            setFormData({
              vendor_id: createdVendor.vendor_id,
              name: createdVendor.name,
              email: createdVendor.email,
              address: createdVendor.address || '',
              url: createdVendor.url || '',
              status: createdVendor.status,
              admin_id: createdVendor.admin_id || '',
              image_url: createdVendor.image_url || '',
            })
            setError(`Shop created, but image upload failed: ${message}`)
            return
          } finally {
            setImageWorking(false)
          }
        }

        try {
          const superAdmin = await adminService.createVendorSuperAdminForVendor(
            createdVendor,
            superAdminPassword,
          )
          // Set as primary admin on vendor
          await vendorService.updateVendor(createdVendor.id, { admin_id: superAdmin.id })
          // Assign as vendor super admin in vendor_admins mapping
          await vendorAdminService.saveAdminsForVendor(createdVendor.id, [
            { admin_id: superAdmin.id, is_vendor_super_admin: true },
          ])
        } catch (autoError) {
          console.error('Failed to create vendor super admin:', autoError)
          setError('Shop created but failed to create default shop super user. Please create an admin manually.')
        }
      }

      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shop')
    } finally {
      setImageWorking(false)
    }
  }

  const getAssignedAdminsForVendor = (vendorId: string) => {
    const ids = vendorAdminAssignments[vendorId]?.adminIds || []
    return ids.map((id) => admins.find((a) => a.id === id)).filter(Boolean) as User[]
  }

  const buildInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')

  const handleSaveVendorAdminAssignments = async (vendor: Vendor) => {
    if (assignVendorId !== vendor.id) return

    const current = vendorAdminAssignments[vendor.id] || { adminIds: [], superAdminIds: [] }
    const nextAdminIds = assignSelectedAdminIds
    const nextSuperAdminIds = current.superAdminIds.filter((id) => nextAdminIds.includes(id))

    setAssignSaving(true)
    setAssignError(null)
    try {
      const payload = nextAdminIds.map((id) => ({
        admin_id: id,
        is_vendor_super_admin: nextSuperAdminIds.includes(id),
      }))
      await vendorAdminService.saveAdminsForVendor(vendor.id, payload)

      // Keep legacy vendors.admin_id column in sync with first assigned admin
      const primaryAdminId = nextAdminIds[0] ?? null
      await vendorService.updateVendor(vendor.id, { admin_id: primaryAdminId })
      setVendors((prev) => prev.map((v) => (v.id === vendor.id ? { ...v, admin_id: primaryAdminId } : v)))

      setVendorAdminAssignments((prev) => ({
        ...prev,
        [vendor.id]: {
          adminIds: nextAdminIds,
          superAdminIds: nextSuperAdminIds,
        },
      }))

      setAssignVendorId(null)
      setAssignSelectedAdminIds([])
      setAssignSearch('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update assigned admins'
      setAssignError(message)
    } finally {
      setAssignSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading shops...</p>
      </div>
    )
  }

  if (!isGrandUser) {
    return (
      <div className="space-y-4">
        {/* Header with Title and Buttons */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
              <p className="text-sm text-gray-500 mt-1">Manage shops and their assigned admins</p>
            </div>

            {/* Search Bar */}
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex-1 sm:w-64 bg-white rounded-lg border border-gray-200 h-9 px-3 flex items-center gap-2">
                <Search size={18} className="text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search shops..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 h-9 border-0 focus:ring-0 px-0 py-0 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg flex gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Vendors Table */}
        {scopedVendors.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
            <Store size={32} className="text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              {searchTerm ? 'No shops found' : 'No shops assigned yet. Please contact a Grand User to assign shops to you.'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'No shops assigned yet. Please contact a Grand User to assign shops to you.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {pagedVendors.map((vendor) => {
                const assignedAdmins = getAssignedAdminsForVendor(vendor.id)

                return (
                  <div key={vendor.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {vendor.image_url ? (
                        <img
                          src={vendor.image_url}
                          alt={vendor.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center ring-2 ring-gray-200 flex-shrink-0">
                          <span className="text-white font-bold text-sm">
                            {vendor.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{vendor.name}</p>
                            <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                          </div>
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border',
                              vendor.status === 'active'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200',
                            )}
                          >
                            {vendor.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-600">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-500">Shop ID</span>
                            <span className="font-medium text-gray-800">{vendor.vendor_id}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-500">URL</span>
                            {vendor.url ? (
                              <a
                                href={vendor.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline truncate max-w-[60%]"
                              >
                                {vendor.url}
                              </a>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-500">Assigned admins</span>
                      {assignedAdmins.length === 0 ? (
                        <span className="text-xs text-gray-600">Unassigned</span>
                      ) : (
                        <div className="flex items-center -space-x-1">
                          {assignedAdmins.slice(0, 3).map((admin) => {
                            const rawAvatar = admin.profile_image_url || ''
                            const hasSafeRawAvatar =
                              rawAvatar.startsWith('http') &&
                              !rawAvatar.includes('/storage/v1/object/sign/admin-profiles/')
                            const avatarUrl = brokenAvatarAdminIds[admin.id]
                              ? ''
                              : adminAvatarUrls[admin.id] || (hasSafeRawAvatar ? rawAvatar : '')

                            return avatarUrl ? (
                              <img
                                key={admin.id}
                                src={avatarUrl}
                                alt={admin.name}
                                title={admin.name}
                                className="h-7 w-7 rounded-full object-cover ring-2 ring-white bg-white"
                                onError={() => {
                                  setBrokenAvatarAdminIds((prev) => ({ ...prev, [admin.id]: true }))
                                }}
                              />
                            ) : (
                              <div
                                key={admin.id}
                                className="h-7 w-7 rounded-full bg-blue-50 ring-2 ring-white flex items-center justify-center text-[10px] font-semibold text-blue-700"
                                title={admin.name}
                              >
                                {buildInitials(admin.name || admin.email || 'A')}
                              </div>
                            )
                          })}
                          {assignedAdmins.length > 3 && (
                            <div className="h-7 w-7 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-[10px] font-semibold text-gray-700">
                              +{assignedAdmins.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Shop</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Shop ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">URL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned admins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pagedVendors.map((vendor) => {
                    const assignedAdmins = getAssignedAdminsForVendor(vendor.id)
                    return (
                      <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {vendor.image_url ? (
                              <img
                                src={vendor.image_url}
                                alt={vendor.name}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center ring-2 ring-gray-200">
                                <span className="text-white font-bold text-sm">
                                  {vendor.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{vendor.name}</p>
                              <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">{vendor.vendor_id}</p>
                        </td>
                        <td className="px-4 py-3">
                          {vendor.url ? (
                            <a
                              href={vendor.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {vendor.url}
                            </a>
                          ) : (
                            <p className="text-sm text-gray-400">—</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              vendor.status === 'active'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-gray-50 text-gray-700 border border-gray-200'
                            }`}
                          >
                            {vendor.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {assignedAdmins.length === 0 ? (
                            <p className="text-sm text-gray-600">Unassigned</p>
                          ) : (
                            <div className="flex items-center -space-x-1">
                              {assignedAdmins.slice(0, 3).map((admin) => {
                                const rawAvatar = admin.profile_image_url || ''
                                const hasSafeRawAvatar =
                                  rawAvatar.startsWith('http') &&
                                  !rawAvatar.includes('/storage/v1/object/sign/admin-profiles/')
                                const avatarUrl = brokenAvatarAdminIds[admin.id]
                                  ? ''
                                  : adminAvatarUrls[admin.id] || (hasSafeRawAvatar ? rawAvatar : '')

                                return avatarUrl ? (
                                  <img
                                    key={admin.id}
                                    src={avatarUrl}
                                    alt={admin.name}
                                    title={admin.name}
                                    className="h-7 w-7 rounded-full object-cover ring-2 ring-white bg-white"
                                    onError={() => {
                                      setBrokenAvatarAdminIds((prev) => ({ ...prev, [admin.id]: true }))
                                    }}
                                  />
                                ) : (
                                  <div
                                    key={admin.id}
                                    className="h-7 w-7 rounded-full bg-blue-50 ring-2 ring-white flex items-center justify-center text-[10px] font-semibold text-blue-700"
                                    title={admin.name}
                                  >
                                    {buildInitials(admin.name || admin.email || 'A')}
                                  </div>
                                )
                              })}
                              {assignedAdmins.length > 3 && (
                                <div className="h-7 w-7 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-[10px] font-semibold text-gray-700">
                                  +{assignedAdmins.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-600">
              <div>
                Showing {totalVendors === 0 ? 0 : startIndex + 1}–
                {Math.min(startIndex + rowsPerPage, totalVendors)} of {totalVendors}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Rows per page</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 10
                      setRowsPerPage(value)
                      setPage(1)
                    }}
                    className="h-7 border border-gray-300 rounded-md text-xs text-gray-900 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 justify-between sm:justify-start">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                  >
                    Prev
                  </button>
                  <span className="text-gray-500">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Title and Buttons */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
            <p className="text-sm text-gray-500 mt-1">Manage shops and their assigned admins</p>
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 sm:w-64 bg-white rounded-lg border border-gray-200 h-9 px-3 flex items-center gap-2">
              <Search size={18} className="text-gray-400" />
              <Input
                type="text"
                placeholder="Search shops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-9 border-0 focus:ring-0 px-0 py-0 text-sm"
              />
            </div>

            {/* Add Button - only for Grand Users */}
            {isGrandUser && (
              <Button onClick={handleAddNew} size="sm">
                <Plus size={16} />
                Add Shop
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg flex gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Vendor Form Modal */}
      {showForm && (
        <Dialog open={true} onOpenChange={setShowForm}>
          <DialogContent
            className="max-w-lg max-h-[calc(100dvh-2rem)] p-0 flex flex-col overflow-hidden min-h-0 bg-white"
            showCloseButton={false}
          >
            <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
              <DialogHeader className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-base sm:text-lg font-semibold text-gray-900">
                    {selectedVendor ? 'Edit Shop' : 'Add New Shop'}
                  </DialogTitle>
                  <DialogClose asChild>
                    <button
                      type="button"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 bg-white min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor_id" className="text-sm font-semibold text-gray-900" required>Shop ID</Label>
                  <Input
                    id="vendor_id"
                    type="text"
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    placeholder="Unique shop code"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-900" required>Shop Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Shop name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-900" required>Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="shop@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm font-semibold text-gray-900">Shop URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://shop-site.com"
                  />
                </div>

                {!selectedVendor && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="superadmin_password" className="text-sm font-semibold text-gray-900" required>
                      Shop super admin password
                    </Label>
                    <div className="relative">
                      <Input
                        id="superadmin_password"
                        type={showSuperAdminPassword ? 'text' : 'password'}
                        value={superAdminPassword}
                        onChange={(e) => setSuperAdminPassword(e.target.value)}
                        placeholder="Password for this shop's super admin"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSuperAdminPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                        aria-label={showSuperAdminPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSuperAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-sm font-semibold text-gray-900">Address</Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Shop address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-semibold text-gray-900">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full h-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_id" className="text-sm font-semibold text-gray-900">Assigned Admin</Label>
                  <select
                    id="admin_id"
                    value={formData.admin_id}
                    onChange={(e) => setFormData({ ...formData, admin_id: e.target.value })}
                    className="w-full h-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  >
                    <option value="">Unassigned</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name} ({admin.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="vendor_image" className="text-sm font-semibold text-gray-900">Shop Image</Label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-200 bg-gray-50 flex items-center justify-center">
                      {imagePreviewUrl ? (
                        <img
                          src={imagePreviewUrl}
                          alt="Shop"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-gray-500">No image</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <Input
                        id="vendor_image"
                        type="file"
                        accept="image/*"
                        disabled={imageWorking}
                        onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        {imageFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={imageWorking}
                            onClick={() => handleImageChange(null)}
                          >
                            Clear selection
                          </Button>
                        )}

                        {selectedVendor?.id && (selectedVendor.image_url || formData.image_url) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={imageWorking}
                            onClick={handleRemoveImage}
                          >
                            {imageWorking ? 'Removing...' : 'Remove image'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              </div>

              <DialogFooter className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-white flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="h-9 px-4">
                  Cancel
                </Button>
                <Button type="submit" className="h-9 px-4">
                  {selectedVendor ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {showAdminsDialog && adminsVendor && (
        <Dialog open={true} onOpenChange={setShowAdminsDialog}>
          <DialogContent className="max-w-lg bg-white">
            <DialogHeader className="border-b border-gray-200 pb-4">
              <DialogTitle className="text-xl font-bold text-gray-900">
                Manage admins for {adminsVendor.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {admins.map((admin) => {
                  const assigned = assignedAdminIds.includes(admin.id)
                  const isSuper = superAdminIds.includes(admin.id)
                  return (
                    <div
                      key={admin.id}
                      className="flex items-start justify-between gap-4 border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <div>
                        <label className="flex items-center gap-2 text-sm text-gray-900">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={assigned}
                            onChange={(e) => handleToggleAssignedAdmin(admin.id, e.target.checked)}
                          />
                          <span>{admin.name}</span>
                          <span className="text-xs text-gray-500">{admin.email}</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={assigned && isSuper}
                          disabled={!assigned}
                          onChange={(e) => handleToggleSuperAdmin(admin.id, e.target.checked)}
                        />
                        <span className="text-xs text-gray-700">Shop super admin</span>
                      </div>
                    </div>
                  )
                })}
                {admins.length === 0 && (
                  <p className="text-sm text-gray-500">No admins available. Create admins first.</p>
                )}
              </div>

              <DialogFooter className="gap-3 border-t border-gray-200 pt-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdminsDialog(false)}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveVendorAdmins}
                  disabled={savingAdmins}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {savingAdmins ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Vendors Table */}
      {scopedVendors.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
          <Store size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            {searchTerm ? 'No shops found' : isGrandUser
              ? 'Create your first shop to get started.'
              : 'No shops assigned yet. Please contact a Grand User to assign shops to you.'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm
              ? 'Try adjusting your search terms'
              : isGrandUser
                ? 'Create your first shop to get started.'
                : 'No shops assigned yet. Please contact a Grand User to assign shops to you.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {pagedVendors.map((vendor) => {
              const assignedAdmins = getAssignedAdminsForVendor(vendor.id)
              const isOpen = assignVendorId === vendor.id
              const filteredAdmins = admins.filter((a) => {
                const term = assignSearch.toLowerCase()
                const name = (a.name || '').toLowerCase()
                const email = (a.email || '').toLowerCase()
                return !term || name.includes(term) || email.includes(term)
              })

              return (
                <div key={vendor.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {vendor.image_url ? (
                      <img
                        src={vendor.image_url}
                        alt={vendor.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center ring-2 ring-gray-200 flex-shrink-0">
                        <span className="text-white font-bold text-sm">
                          {vendor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{vendor.name}</p>
                          <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                        </div>
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border',
                            vendor.status === 'active'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200',
                          )}
                        >
                          {vendor.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-600">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-500">Shop ID</span>
                          <span className="font-medium text-gray-800">{vendor.vendor_id}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-500">URL</span>
                          {vendor.url ? (
                            <a
                              href={vendor.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline truncate max-w-[60%]"
                            >
                              {vendor.url}
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <DropdownMenu.Root
                      open={!isDesktop && isOpen}
                      onOpenChange={(open) => {
                        if (isDesktop) return
                        if (open) {
                          setAssignVendorId(vendor.id)
                          setAssignSearch('')
                          setAssignError(null)
                          const validAdminIds = new Set(admins.map((a) => a.id))
                          const baseIds = (vendorAdminAssignments[vendor.id]?.adminIds || []).filter((id) =>
                            validAdminIds.has(id),
                          )
                          setAssignSelectedAdminIds(baseIds)
                        } else if (!assignSaving) {
                          setAssignVendorId(null)
                          setAssignSearch('')
                          setAssignSelectedAdminIds([])
                          setAssignError(null)
                        }
                      }}
                    >
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                          disabled={assignSaving}
                        >
                          <span className="text-gray-500">Assign Admin</span>
                          {assignedAdmins.length === 0 ? (
                            <span className="text-xs text-gray-600">Unassigned</span>
                          ) : (
                            <span className="text-xs font-medium text-gray-800">
                              {assignedAdmins.length} assigned
                            </span>
                          )}
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className="min-w-[260px] rounded-xl border border-gray-200 bg-white shadow-lg p-2 mr-1 mt-2 z-50 space-y-2">
                          <div className="px-1">
                            <Input
                              type="text"
                              placeholder="Search admins..."
                              value={assignSearch}
                              onChange={(e) => setAssignSearch(e.target.value)}
                              className="h-8 text-xs border-gray-300"
                            />
                          </div>
                          <div className="flex items-center justify-between px-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                const filteredIds = filteredAdmins.map((a) => a.id)
                                if (filteredIds.length === 0) return
                                const allSelected = filteredIds.every((id) => assignSelectedAdminIds.includes(id))

                                if (allSelected) {
                                  setAssignSelectedAdminIds((prev) => prev.filter((id) => !filteredIds.includes(id)))
                                } else {
                                  setAssignSelectedAdminIds((prev) => Array.from(new Set([...prev, ...filteredIds])))
                                }
                              }}
                              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                            >
                              {(() => {
                                const filteredIds = filteredAdmins.map((a) => a.id)
                                const allSelected =
                                  filteredIds.length > 0 && filteredIds.every((id) => assignSelectedAdminIds.includes(id))
                                return allSelected ? 'Unselect all' : 'Select all'
                              })()}
                            </button>
                          </div>
                          {assignError && <p className="px-1 text-[11px] text-red-600">{assignError}</p>}
                          <div className="max-h-56 overflow-y-auto space-y-1">
                            {filteredAdmins.length === 0 ? (
                              <div className="px-2 py-2 text-xs text-gray-500">No admins found</div>
                            ) : (
                              filteredAdmins.map((admin) => {
                                const checked = assignSelectedAdminIds.includes(admin.id)
                                const rawAvatar = admin.profile_image_url || ''
                                const hasSafeRawAvatar =
                                  rawAvatar.startsWith('http') &&
                                  !rawAvatar.includes('/storage/v1/object/sign/admin-profiles/')
                                const avatarUrl = brokenAvatarAdminIds[admin.id]
                                  ? ''
                                  : adminAvatarUrls[admin.id] || (hasSafeRawAvatar ? rawAvatar : '')
                                return (
                                  <DropdownMenu.Item
                                    key={admin.id}
                                    className={cn(
                                      'flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 rounded cursor-pointer outline-none hover:bg-gray-50',
                                      checked && 'bg-blue-50',
                                      assignSaving && 'opacity-60 pointer-events-none',
                                    )}
                                    onSelect={(event) => {
                                      event.preventDefault()
                                      setAssignSelectedAdminIds((prev) =>
                                        checked ? prev.filter((id) => id !== admin.id) : [...prev, admin.id],
                                      )
                                    }}
                                  >
                                    <Checkbox checked={checked} className="h-3.5 w-3.5 rounded-[2px]" aria-hidden="true" />
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={admin.name}
                                        className="w-6 h-6 rounded-full object-cover"
                                        onError={() => {
                                          setBrokenAvatarAdminIds((prev) => ({ ...prev, [admin.id]: true }))
                                        }}
                                      />
                                    ) : (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                                        {buildInitials(admin.name || admin.email || 'A')}
                                      </span>
                                    )}
                                    <span className="flex-1 truncate">{admin.name}</span>
                                  </DropdownMenu.Item>
                                )
                              })
                            )}
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 px-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => {
                                setAssignVendorId(null)
                                setAssignSelectedAdminIds([])
                                setAssignSearch('')
                                setAssignError(null)
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-3 text-[11px]"
                              disabled={assignSaving}
                              onClick={() => {
                                void handleSaveVendorAdminAssignments(vendor)
                              }}
                            >
                              {assignSaving ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                          <div className="pt-2 border-t border-gray-100">
                            <DropdownMenu.Item
                              className="px-2 py-1.5 text-xs text-gray-700 rounded cursor-pointer outline-none hover:bg-gray-50"
                              onSelect={(e) => {
                                e.preventDefault()
                                setAssignVendorId(null)
                                setAssignSearch('')
                                setAssignSelectedAdminIds([])
                                setAssignError(null)
                                setTimeout(() => {
                                  void handleManageAdmins(vendor)
                                }, 0)
                              }}
                            >
                              Advanced (shop super admin)
                            </DropdownMenu.Item>
                          </div>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>

                    {isGrandUser && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(vendor)}
                          title="Edit"
                          className="h-9 w-9 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(vendor)}
                          className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Shop</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Shop ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">URL</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assign Admin</th>
                  {isGrandUser && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedVendors.map((vendor) => {
                  const assignedAdmins = getAssignedAdminsForVendor(vendor.id)
                  const isOpen = assignVendorId === vendor.id
                  const filteredAdmins = admins.filter((a) => {
                    const term = assignSearch.toLowerCase()
                    const name = (a.name || '').toLowerCase()
                    const email = (a.email || '').toLowerCase()
                    return !term || name.includes(term) || email.includes(term)
                  })

                  return (
                  <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {vendor.image_url ? (
                          <img
                            src={vendor.image_url}
                            alt={vendor.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center ring-2 ring-gray-200">
                            <span className="text-white font-bold text-sm">
                              {vendor.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{vendor.name}</p>
                          <p className="text-xs text-gray-500 truncate">{vendor.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{vendor.vendor_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      {vendor.url ? (
                        <a
                          href={vendor.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {vendor.url}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400">—</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vendor.status === 'active'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {vendor.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu.Root
                        open={isDesktop && isOpen}
                        onOpenChange={(open) => {
                          if (!isDesktop) return
                          if (open) {
                            setAssignVendorId(vendor.id)
                            setAssignSearch('')
                            setAssignError(null)
                            const validAdminIds = new Set(admins.map((a) => a.id))
                            const baseIds = (vendorAdminAssignments[vendor.id]?.adminIds || []).filter((id) =>
                              validAdminIds.has(id),
                            )
                            setAssignSelectedAdminIds(baseIds)
                          } else if (!assignSaving) {
                            setAssignVendorId(null)
                            setAssignSearch('')
                            setAssignSelectedAdminIds([])
                            setAssignError(null)
                          }
                        }}
                      >
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 px-0 py-0 cursor-pointer bg-transparent border-0"
                            disabled={assignSaving}
                          >
                            {assignedAdmins.length === 0 ? (
                              <span className="text-xs text-gray-500">Unassigned</span>
                            ) : (
                              <div className="flex items-center -space-x-1">
                                {assignedAdmins.slice(0, 3).map((admin) => (
                                  <div
                                    key={admin.id}
                                    className="h-7 w-7 rounded-full bg-blue-50 ring-2 ring-white flex items-center justify-center text-[10px] font-semibold text-blue-700"
                                    title={admin.name}
                                  >
                                    {buildInitials(admin.name || admin.email || 'A')}
                                  </div>
                                ))}
                                {assignedAdmins.length > 3 && (
                                  <div className="h-7 w-7 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-[10px] font-semibold text-gray-700">
                                    +{assignedAdmins.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content className="min-w-[260px] rounded-xl border border-gray-200 bg-white shadow-lg p-2 mr-1 mt-2 z-50 space-y-2">
                            <div className="px-1">
                              <Input
                                type="text"
                                placeholder="Search admins..."
                                value={assignSearch}
                                onChange={(e) => setAssignSearch(e.target.value)}
                                className="h-8 text-xs border-gray-300"
                              />
                            </div>
                            <div className="flex items-center justify-between px-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  const filteredIds = filteredAdmins.map((a) => a.id)
                                  if (filteredIds.length === 0) return
                                  const allSelected = filteredIds.every((id) => assignSelectedAdminIds.includes(id))

                                  if (allSelected) {
                                    setAssignSelectedAdminIds((prev) =>
                                      prev.filter((id) => !filteredIds.includes(id)),
                                    )
                                  } else {
                                    setAssignSelectedAdminIds((prev) =>
                                      Array.from(new Set([...prev, ...filteredIds])),
                                    )
                                  }
                                }}
                                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                              >
                                {(() => {
                                  const filteredIds = filteredAdmins.map((a) => a.id)
                                  const allSelected =
                                    filteredIds.length > 0 &&
                                    filteredIds.every((id) => assignSelectedAdminIds.includes(id))
                                  return allSelected ? 'Unselect all' : 'Select all'
                                })()}
                              </button>
                            </div>
                            {assignError && <p className="px-1 text-[11px] text-red-600">{assignError}</p>}
                            <div className="max-h-56 overflow-y-auto space-y-1">
                              {filteredAdmins.length === 0 ? (
                                <div className="px-2 py-2 text-xs text-gray-500">No admins found</div>
                              ) : (
                                filteredAdmins.map((admin) => {
                                  const checked = assignSelectedAdminIds.includes(admin.id)
                                  return (
                                    <DropdownMenu.Item
                                      key={admin.id}
                                      className={cn(
                                        'flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 rounded cursor-pointer outline-none hover:bg-gray-50',
                                        checked && 'bg-blue-50',
                                        assignSaving && 'opacity-60 pointer-events-none',
                                      )}
                                      onSelect={(event) => {
                                        event.preventDefault()
                                        setAssignSelectedAdminIds((prev) =>
                                          checked ? prev.filter((id) => id !== admin.id) : [...prev, admin.id],
                                        )
                                      }}
                                    >
                                      <Checkbox
                                        checked={checked}
                                        className="h-3.5 w-3.5 rounded-[2px]"
                                        aria-hidden="true"
                                      />
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                                        {buildInitials(admin.name || admin.email || 'A')}
                                      </span>
                                      <span className="flex-1 truncate">{admin.name}</span>
                                    </DropdownMenu.Item>
                                  )
                                })
                              )}
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 px-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => {
                                  setAssignVendorId(null)
                                  setAssignSelectedAdminIds([])
                                  setAssignSearch('')
                                  setAssignError(null)
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 px-3 text-[11px]"
                                disabled={assignSaving}
                                onClick={() => {
                                  void handleSaveVendorAdminAssignments(vendor)
                                }}
                              >
                                {assignSaving ? 'Saving...' : 'Save'}
                              </Button>
                            </div>
                            <div className="pt-2 border-t border-gray-100">
                              <DropdownMenu.Item
                                className="px-2 py-1.5 text-xs text-gray-700 rounded cursor-pointer outline-none hover:bg-gray-50"
                                onSelect={(e) => {
                                  e.preventDefault()
                                  setAssignVendorId(null)
                                  setAssignSearch('')
                                  setAssignSelectedAdminIds([])
                                  setAssignError(null)
                                  setTimeout(() => {
                                    void handleManageAdmins(vendor)
                                  }, 0)
                                }}
                              >
                                Advanced (shop super admin)
                              </DropdownMenu.Item>
                            </div>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                    {isGrandUser && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(vendor)}
                            title="Edit"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(vendor)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )})}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-600">
            <div>
              Showing {totalVendors === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + rowsPerPage, totalVendors)} of {totalVendors}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Rows per page</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 10
                    setRowsPerPage(value)
                    setPage(1)
                  }}
                  className="h-7 border border-gray-300 rounded-md text-xs text-gray-900 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-2 justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                >
                  Prev
                </button>
                <span className="text-gray-500">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
