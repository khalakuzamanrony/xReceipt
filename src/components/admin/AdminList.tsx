import { useEffect, useState } from 'react'
import type { User, Vendor } from '@/types'
import { adminService } from '@/services/adminService'
import { vendorAdminService } from '@/services/vendorAdminService'
import { vendorService } from '@/services/vendorService'
import AdminForm from './AdminForm'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Checkbox } from '@/components/ui/Checkbox'
import { Plus, Edit, Trash2, AlertCircle, Users, Search, Mail } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'

export default function AdminList() {
  const { role, user } = useAuth()
  const { activeVendorId } = useVendor()
  const [admins, setAdmins] = useState<User[]>([])
  const [nonDeletableAdminIds, setNonDeletableAdminIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'grand_user' | 'super_admin' | 'admin'>('all')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [showForm, setShowForm] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null)
  const [adminVendorInfo, setAdminVendorInfo] = useState<
    Record<string, { vendorId: string; vendorName: string; isVendorSuperAdmin: boolean }[]>
  >({})
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [assignAdminId, setAssignAdminId] = useState<string | null>(null)
  const [assignSearch, setAssignSearch] = useState('')
  const [assignSelectedVendorIds, setAssignSelectedVendorIds] = useState<string[]>([])
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [adminToDelete, setAdminToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isGrandUserView = role === 'grand_user'

  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    try {
      setLoading(true)
      setError(null)
      setInfo(null)
      const data = role === 'grand_user'
        ? await adminService.getAllUsers()
        : await adminService.getAllAdmins()
      setAdmins(data)

      try {
        const superAdminIds = await vendorAdminService.getVendorSuperAdminAdminIds()
        setNonDeletableAdminIds(superAdminIds)
      } catch (err) {
        console.error('Failed to load vendor super admin info:', err)
      }

      // Load vendor memberships for each admin for richer UI
      try {
        const entries: [
          string,
          { vendorId: string; vendorName: string; isVendorSuperAdmin: boolean }[],
        ][] = await Promise.all(
          data.map(async (admin) => {
            try {
              const memberships = await vendorAdminService.getVendorsForAdmin(admin.id)
              const mapped = memberships.map((m) => ({
                vendorId: m.vendor.id,
                vendorName: m.vendor.name,
                isVendorSuperAdmin: m.isVendorSuperAdmin,
              }))
              return [admin.id, mapped]
            } catch {
              return [
                admin.id,
                [] as { vendorId: string; vendorName: string; isVendorSuperAdmin: boolean }[],
              ]
            }
          }),
        )
        const infoMap: Record<
          string,
          { vendorId: string; vendorName: string; isVendorSuperAdmin: boolean }[]
        > = {}
        for (const [adminId, list] of entries) {
          infoMap[adminId] = list
        }
        setAdminVendorInfo(infoMap)
      } catch (err) {
        console.error('Failed to load admin vendor memberships:', err)
      }

      // Load vendors for assignment (grand users manage all vendors)
      if (role === 'grand_user') {
        try {
          const allVendors = await vendorService.getAllVendors()
          setVendors(allVendors)
        } catch (err) {
          console.error('Failed to load vendors for admin assignments:', err)
        }
      } else {
        setVendors([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load admins'
      // Check if it's a database error (table doesn't exist)
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        setError('Database not set up yet. Please create the required tables in Supabase.')
      } else {
        setError(errorMessage)
      }
      setAdmins([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    setSelectedAdmin(null)
    setShowForm(true)
  }

  const handleEdit = (admin: User) => {
    setSelectedAdmin(admin)
    setShowForm(true)
  }

  const handleRequestDelete = (admin: User) => {
    if (nonDeletableAdminIds.includes(admin.id)) {
      setError('This admin is a shop super user and cannot be deleted. Reassign shop super admins first.')
      return
    }
    setAdminToDelete(admin)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return

    if (nonDeletableAdminIds.includes(adminToDelete.id)) {
      setError('This admin is a shop super user and cannot be deleted. Reassign shop super admins first.')
      setShowDeleteConfirm(false)
      setAdminToDelete(null)
      return
    }

    try {
      setIsDeleting(true)
      await adminService.deleteAdmin(adminToDelete.id)
      setAdmins((prev) => prev.filter((a) => a.id !== adminToDelete.id))
      setShowDeleteConfirm(false)
      setAdminToDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete admin')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedAdmin(null)
    loadAdmins()
  }

  const handleSendResetEmailForAdmin = async (admin: User) => {
    try {
      setError(null)
      setInfo(null)
      await adminService.sendPasswordResetEmail(admin.email)
      setInfo(`Password reset email sent to ${admin.email}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email')
    }
  }

  const isVendorSuperAdmin = user ? nonDeletableAdminIds.includes(user.id) : false
  const currentUserSuperVendorIds =
    user && adminVendorInfo[user.id]
      ? adminVendorInfo[user.id]
          .filter((v) => v.isVendorSuperAdmin)
          .map((v) => v.vendorId)
      : []

  const searchFilteredAdmins = admins.filter(
    (admin) =>
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  let filteredAdmins = searchFilteredAdmins

  if (role === 'grand_user') {
    // For grand users, filter by selected vendor if any
    if (activeVendorId) {
      filteredAdmins = filteredAdmins.filter((admin) => {
        const info = adminVendorInfo[admin.id]
        if (!info || info.length === 0) return false
        return info.some((v) => v.vendorId === activeVendorId)
      })
    }
  } else if (isVendorSuperAdmin && currentUserSuperVendorIds.length) {
    // Vendor super admins see only admins belonging to their vendor(s),
    // optionally further filtered by the globally selected vendor
    const allowedVendorIds = activeVendorId
      ? currentUserSuperVendorIds.filter((id) => id === activeVendorId)
      : currentUserSuperVendorIds

    filteredAdmins = filteredAdmins.filter((admin) => {
      const info = adminVendorInfo[admin.id]
      if (!info || info.length === 0) return false
      return info.some((v) => allowedVendorIds.includes(v.vendorId))
    })
  }

  // Role-based filter for grand user view
  if (roleFilter !== 'all') {
    filteredAdmins = filteredAdmins.filter((admin) => {
      if (roleFilter === 'grand_user') {
        return admin.role === 'grand_user'
      }

      const vendorInfo = adminVendorInfo[admin.id] || []
      const isAnyVendorSuper = vendorInfo.some((v) => v.isVendorSuperAdmin)

      if (roleFilter === 'super_admin') {
        return admin.role === 'admin' && isAnyVendorSuper
      }

      if (roleFilter === 'admin') {
        return admin.role === 'admin' && !isAnyVendorSuper
      }

      return true
    })
  }

  const totalAdmins = filteredAdmins.length
  const totalPages = Math.max(1, Math.ceil(totalAdmins / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedAdmins = filteredAdmins.slice(startIndex, startIndex + rowsPerPage)

  const renderVendorSummary = (adminId: string) => {
    const info = adminVendorInfo[adminId]
    if (!info || info.length === 0) return 'No shops assigned'

    const superVendors = info.filter((v) => v.isVendorSuperAdmin)
    const normalVendors = info.filter((v) => !v.isVendorSuperAdmin)

    const parts: string[] = []
    if (superVendors.length) {
      parts.push(`Super for ${superVendors.map((v) => v.vendorName).join(', ')}`)
    }
    if (normalVendors.length) {
      parts.push(`Shop ${normalVendors.map((v) => v.vendorName).join(', ')}`)
    }
    return parts.join(' • ')
  }

  const buildVendorInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')

  const handleSaveVendorAssignmentsForAdmin = async (admin: User) => {
    if (assignAdminId !== admin.id) return

    try {
      setAssignSaving(true)
      setAssignError(null)

      const currentInfo = adminVendorInfo[admin.id] || []
      const currentVendorIds = currentInfo.map((v) => v.vendorId)
      const finalVendorIds = assignSelectedVendorIds
      const touchedVendorIds = Array.from(new Set([...currentVendorIds, ...finalVendorIds]))

      for (const vendorId of touchedVendorIds) {
        const existing = await vendorAdminService.getAdminsForVendor(vendorId)
        const others = existing.filter((va) => va.admin_id !== admin.id)
        const isSelected = finalVendorIds.includes(vendorId)

        const newAssignments = isSelected
          ? [
              ...others.map((va) => ({
                admin_id: va.admin_id,
                is_vendor_super_admin: va.is_vendor_super_admin,
              })),
              {
                admin_id: admin.id,
                is_vendor_super_admin:
                  currentInfo.find((v) => v.vendorId === vendorId)?.isVendorSuperAdmin || false,
              },
            ]
          : others.map((va) => ({
              admin_id: va.admin_id,
              is_vendor_super_admin: va.is_vendor_super_admin,
            }))

        await vendorAdminService.saveAdminsForVendor(vendorId, newAssignments)
      }

      setAdminVendorInfo((prev) => {
        const updated = { ...prev }
        const infoList = finalVendorIds
          .map((vendorId) => {
            const vendor = vendors.find((v) => v.id === vendorId)
            if (!vendor) return null
            const isVendorSuperAdminFlag =
              currentInfo.find((v) => v.vendorId === vendorId)?.isVendorSuperAdmin || false
            return {
              vendorId: vendor.id,
              vendorName: vendor.name,
              isVendorSuperAdmin: isVendorSuperAdminFlag,
            }
          })
          .filter(Boolean) as { vendorId: string; vendorName: string; isVendorSuperAdmin: boolean }[]

        updated[admin.id] = infoList
        return updated
      })

      setAssignAdminId(null)
      setAssignSelectedVendorIds([])
      setAssignSearch('')
      setAssignError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign shops to admin'
      setAssignError(message)
    } finally {
      setAssignSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading admins...</p>
      </div>
    )
  }

  if (role !== 'grand_user' && !isVendorSuperAdmin) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Users size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">You don't have access to Admin management</p>
        <p className="text-gray-500 text-sm mt-1">Only Grand Users can manage admin users.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Title and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isGrandUserView ? 'Users' : 'Admins'}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isGrandUserView
                ? 'Manage grand users, shop super admins, and admins'
                : 'Manage admin users, shop memberships, and permissions'}
            </p>
          </div>

          {/* Search + Add Button */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 sm:w-64 bg-white rounded-lg border border-gray-200 h-9 px-3 flex items-center gap-2">
              <Search size={18} className="text-gray-400" />
              <Input
                type="text"
                placeholder={isGrandUserView ? 'Search users by name or email...' : 'Search admins by name or email...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-9 border-0 focus:ring-0 px-0 py-0 text-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
              {isGrandUserView && (
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'grand_user', label: 'Grand Users' },
                    { id: 'super_admin', label: 'Super Admins' },
                    { id: 'admin', label: 'Admins' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setRoleFilter(option.id as any)}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        roleFilter === option.id
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              <Button onClick={handleAddNew} size="sm">
                <Plus size={16} />
                {isGrandUserView ? 'Add User' : 'Add Admin'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg flex gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Setup Required</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {info && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-4 rounded-lg flex gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Success</p>
            <p className="text-sm mt-1">{info}</p>
          </div>
        </div>
      )}

      {/* Admin Form Modal */}
      {showForm && (
        <AdminForm
          admin={selectedAdmin}
          onClose={handleFormClose}
          canEditEmail={selectedAdmin ? nonDeletableAdminIds.includes(selectedAdmin.id) : true}
        />
      )}

      {/* Admin List Table */}
      {filteredAdmins.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
          <Users size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            {searchTerm ? 'No admins found' : 'No admins yet'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Create your first admin to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                  {isGrandUserView && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedAdmins.map((admin) => {
                  const isNonDeletable = nonDeletableAdminIds.includes(admin.id)
                  return (
                    <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            {admin.profile_image_url ? (
                              <img
                                src={admin.profile_image_url}
                                alt={admin.name}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-gray-200">
                                <span className="text-white font-bold text-sm">
                                  {admin.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-sm font-medium text-gray-900">{admin.name}</span>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            {renderVendorSummary(admin.id)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{admin.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">{admin.phone || '—'}</p>
                      </td>
                      {isGrandUserView && (
                        <td
                          className="px-4 py-3"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          {vendors.length === 0 ? (
                            <span className="text-xs text-gray-400">No shops</span>
                          ) : (
                            (() => {
                              const assignedInfo = adminVendorInfo[admin.id] || []
                              const assignedVendorIds = assignedInfo.map((v) => v.vendorId)
                              const assignedVendors = vendors.filter((v) =>
                                assignedVendorIds.includes(v.id),
                              )

                              const search = assignSearch.toLowerCase()
                              const filteredVendors = vendors.filter((v) =>
                                v.name.toLowerCase().includes(search),
                              )
                              const filteredIds = filteredVendors.map((v) => v.id)
                              const allSelectedForFiltered =
                                filteredIds.length > 0 &&
                                filteredIds.every((id) => assignSelectedVendorIds.includes(id))

                              return (
                                <DropdownMenu.Root
                                  open={assignAdminId === admin.id}
                                  onOpenChange={(open) => {
                                    if (open) {
                                      setAssignAdminId(admin.id)
                                      setAssignSearch('')
                                      setAssignError(null)
                                      const validVendorIds = new Set(vendors.map((v) => v.id))
                                      const baseIds = assignedVendorIds.filter((id) =>
                                        validVendorIds.has(id),
                                      )
                                      setAssignSelectedVendorIds(baseIds)
                                    } else if (assignAdminId === admin.id && !assignSaving) {
                                      setAssignAdminId(null)
                                      setAssignSelectedVendorIds([])
                                      setAssignSearch('')
                                      setAssignError(null)
                                    }
                                  }}
                                >
                                  <DropdownMenu.Trigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex items-center -space-x-1 px-0 py-0 cursor-pointer bg-transparent border-0"
                                      title={
                                        assignedVendors.length === 1
                                          ? assignedVendors[0].name
                                          : assignedVendors.length > 1
                                            ? `${assignedVendors[0].name} +${assignedVendors.length - 1}`
                                            : 'Assign shops'
                                      }
                                    >
                                      {assignedVendors.length > 0 ? (
                                        <div className="flex items-center -space-x-1">
                                          {assignedVendors.slice(0, 3).map((v) => (
                                            v.image_url ? (
                                              <img
                                                key={v.id}
                                                src={v.image_url}
                                                alt={v.name}
                                                className="w-7 h-7 rounded-full object-cover"
                                              />
                                            ) : (
                                              <span
                                                key={v.id}
                                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-xs font-semibold text-blue-700"
                                              >
                                                {buildVendorInitials(v.name)}
                                              </span>
                                            )
                                          ))}
                                          {assignedVendors.length > 3 && (
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700">
                                              +{assignedVendors.length - 3}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-500 px-1">Assign</span>
                                      )}
                                    </button>
                                  </DropdownMenu.Trigger>
                                  <DropdownMenu.Portal>
                                    <DropdownMenu.Content className="min-w-[260px] rounded-md border border-gray-200 bg-white shadow-lg p-2 mr-1 mt-1 z-50 space-y-2">
                                      <div className="px-1">
                                        <Input
                                          type="text"
                                          placeholder="Search shops..."
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
                                            if (filteredIds.length === 0) return

                                            if (allSelectedForFiltered) {
                                              setAssignSelectedVendorIds((prev) =>
                                                prev.filter((id) => !filteredIds.includes(id)),
                                              )
                                            } else {
                                              setAssignSelectedVendorIds((prev) =>
                                                Array.from(new Set([...prev, ...filteredIds])),
                                              )
                                            }
                                          }}
                                          className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                                        >
                                          {allSelectedForFiltered ? 'Unselect all' : 'Select all'}
                                        </button>
                                      </div>
                                      {assignError && (
                                        <p className="px-1 text-[11px] text-red-600">{assignError}</p>
                                      )}
                                      <div className="max-h-48 overflow-y-auto space-y-1 mt-1">
                                        {filteredVendors.length === 0 ? (
                                          <div className="px-2 py-2 text-xs text-gray-500">No shops found</div>
                                        ) : (
                                          filteredVendors.map((vendor) => {
                                            const checked = assignSelectedVendorIds.includes(vendor.id)
                                            const vendorInitials = buildVendorInitials(vendor.name)

                                            return (
                                              <DropdownMenu.Item
                                                key={vendor.id}
                                                className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 rounded cursor-pointer outline-none hover:bg-gray-50"
                                                onSelect={(event) => {
                                                  event.preventDefault()
                                                  setAssignSelectedVendorIds((prev) =>
                                                    checked
                                                      ? prev.filter((id) => id !== vendor.id)
                                                      : [...prev, vendor.id],
                                                  )
                                                }}
                                              >
                                                <Checkbox
                                                  checked={checked}
                                                  className="h-3.5 w-3.5 rounded-[2px]"
                                                  aria-hidden="true"
                                                />
                                                {vendor.image_url ? (
                                                  <img
                                                    src={vendor.image_url}
                                                    alt={vendor.name}
                                                    className="w-6 h-6 rounded-full object-cover"
                                                  />
                                                ) : (
                                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                                                    {vendorInitials}
                                                  </span>
                                                )}
                                                <span className="flex-1 truncate">{vendor.name}</span>
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
                                            setAssignAdminId(null)
                                            setAssignSelectedVendorIds([])
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
                                            void handleSaveVendorAssignmentsForAdmin(admin)
                                          }}
                                        >
                                          {assignSaving ? 'Saving...' : 'Save'}
                                        </Button>
                                      </div>
                                    </DropdownMenu.Content>
                                  </DropdownMenu.Portal>
                                </DropdownMenu.Root>
                              )
                            })()
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">
                          {new Date(admin.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendResetEmailForAdmin(admin)}
                            title="Send reset link"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                          >
                            <Mail size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(admin)}
                            title="Edit"
                            className="h-8 w-8 p-0 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-full"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRequestDelete(admin)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                            title={isNonDeletable ? 'Shop super user cannot be deleted' : 'Delete'}
                            disabled={isNonDeletable}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <div>
              Showing {totalAdmins === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + rowsPerPage, totalAdmins)} of {totalAdmins}
            </div>
            <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-2">
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

      {/* Delete confirmation modal */}
      {showDeleteConfirm && adminToDelete && (
        <Dialog
          open={showDeleteConfirm}
          onOpenChange={(open) => {
            setShowDeleteConfirm(open)
            if (!open) {
              setAdminToDelete(null)
            }
          }}
        >
          <DialogContent className="max-w-sm w-full p-0 flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-200 bg-white">
              <DialogTitle className="text-lg">Delete Admin</DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete admin{' '}
                <span className="font-semibold">{adminToDelete.name}</span>{' '}
                with email <span className="font-mono">{adminToDelete.email}</span>?
              </p>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setAdminToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDelete}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
