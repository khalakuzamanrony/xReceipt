import { useEffect, useState } from 'react'
import type { User } from '@/types'
import { adminService } from '@/services/adminService'
import { vendorAdminService } from '@/services/vendorAdminService'
import AdminForm from './AdminForm'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Edit, Trash2, AlertCircle, Users, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminList() {
  const { role } = useAuth()
  const [admins, setAdmins] = useState<User[]>([])
  const [nonDeletableAdminIds, setNonDeletableAdminIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null)

  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.getAllAdmins()
      setAdmins(data)

      try {
        const superAdminIds = await vendorAdminService.getVendorSuperAdminAdminIds()
        setNonDeletableAdminIds(superAdminIds)
      } catch (err) {
        console.error('Failed to load vendor super admin info:', err)
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

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading admins...</p>
      </div>
    )
  }

  if (role !== 'grand_user') {
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
      {/* Header with Title and Buttons */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admins</h1>
            <p className="text-sm text-gray-500 mt-1">Manage admin users and permissions</p>
          </div>

          {/* Search Bar */}
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

            {/* Add Button */}
            <Button onClick={handleAddNew} size="sm">
              <Plus size={16} />
              Add Admin
            </Button>
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
                {filteredAdmins.map((admin) => {
                  const isNonDeletable = nonDeletableAdminIds.includes(admin.id)
                  return (
                    <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
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
        </div>
      )}
    </div>
  )
}
