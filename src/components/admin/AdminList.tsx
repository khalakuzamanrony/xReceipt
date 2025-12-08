import { useEffect, useState } from 'react'
import type { User } from '@/types'
import { adminService } from '@/services/adminService'
import { vendorAdminService } from '@/services/vendorAdminService'
import AdminForm from './AdminForm'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Plus, Edit, Trash2, AlertCircle, Users, Search } from 'lucide-react'
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
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [showForm, setShowForm] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null)
  const [resetEmail, setResetEmail] = useState('')
  const [adminVendorInfo, setAdminVendorInfo] = useState<
    Record<string, { vendorId: string; vendorName: string; isVendorSuperAdmin: boolean }[]>
  >({})

  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    try {
      setLoading(true)
      setError(null)
      setInfo(null)
      const data = await adminService.getAllAdmins()
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

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) return
    try {
      setError(null)
      setInfo(null)
      await adminService.sendPasswordResetEmail(resetEmail)
      setInfo(`Password reset email sent to ${resetEmail}`)
      setResetEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email')
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

  const handleDelete = async (id: string) => {
    if (nonDeletableAdminIds.includes(id)) {
      setError('This admin is a vendor super user and cannot be deleted. Reassign vendor super admins first.')
      return
    }
    if (!confirm('Are you sure you want to delete this admin?')) return

    try {
      await adminService.deleteAdmin(id)
      setAdmins(admins.filter(a => a.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete admin')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedAdmin(null)
    loadAdmins()
  }

  const lastCreatedAdmin = admins[0] || null
  const isVendorSuperAdmin = user ? nonDeletableAdminIds.includes(user.id) : false
  const currentUserSuperVendorIds =
    user && adminVendorInfo[user.id]
      ? adminVendorInfo[user.id]
          .filter((v) => v.isVendorSuperAdmin)
          .map((v) => v.vendorId)
      : []

  // Stats: vendor super admins either global or for the selected vendor
  const vendorSuperAdminCount = activeVendorId
    ? Object.entries(adminVendorInfo).reduce((count, [adminId, list]) => {
        if (!nonDeletableAdminIds.includes(adminId)) return count
        const hasSuperForVendor = list.some(
          (v) => v.vendorId === activeVendorId && v.isVendorSuperAdmin,
        )
        return count + (hasSuperForVendor ? 1 : 0)
      }, 0)
    : nonDeletableAdminIds.length

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

  const totalAdmins = filteredAdmins.length
  const totalPages = Math.max(1, Math.ceil(totalAdmins / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedAdmins = filteredAdmins.slice(startIndex, startIndex + rowsPerPage)

  const renderVendorSummary = (adminId: string) => {
    const info = adminVendorInfo[adminId]
    if (!info || info.length === 0) return 'No vendors assigned'

    const superVendors = info.filter((v) => v.isVendorSuperAdmin)
    const normalVendors = info.filter((v) => !v.isVendorSuperAdmin)

    const parts: string[] = []
    if (superVendors.length) {
      parts.push(`Super for ${superVendors.map((v) => v.vendorName).join(', ')}`)
    }
    if (normalVendors.length) {
      parts.push(`Vendor ${normalVendors.map((v) => v.vendorName).join(', ')}`)
    }
    return parts.join(' • ')
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
      {/* Header with Title, Stats, and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admins</h1>
            <p className="text-sm text-gray-500 mt-1">Manage admin users, vendor memberships, and permissions</p>
          </div>

          {/* Search + Add Button */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 sm:w-64 bg-white rounded-lg border border-gray-200 h-9 px-3 flex items-center gap-2">
              <Search size={18} className="text-gray-400" />
              <Input
                type="text"
                placeholder="Search admins by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-9 border-0 focus:ring-0 px-0 py-0 text-sm"
              />
            </div>

            <Button onClick={handleAddNew} size="sm">
              <Plus size={16} />
              Add Admin
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Total admins</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{admins.length}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Vendor super admins</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{vendorSuperAdminCount}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Last created</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {lastCreatedAdmin
                ? new Date(lastCreatedAdmin.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'}
            </p>
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

      {/* Global password reset by email */}
      <form onSubmit={handleSendResetEmail} className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1 w-full sm:w-auto">
          <Label htmlFor="reset-email" className="text-xs text-gray-700">Send password reset email</Label>
          <Input
            id="reset-email"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="user@example.com"
            className="mt-1 h-9 text-sm"
            required
          />
        </div>
        <Button type="submit" size="sm" className="mt-1">
          Send reset link
        </Button>
      </form>

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
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(admin)}
                            title="Edit"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(admin.id)}
                            className="text-red-600 hover:text-red-700"
                            title={isNonDeletable ? 'Vendor super user cannot be deleted' : 'Delete'}
                            disabled={isNonDeletable}
                          >
                            <Trash2 size={14} />
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
    </div>
  )
}
