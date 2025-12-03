import { useEffect, useState } from 'react'
import type { User } from '@/types'
import { adminService } from '@/services/adminService'
import AdminForm from './AdminForm'
import { Plus, Edit, Trash2, AlertCircle, Users } from 'lucide-react'

export default function AdminList() {
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading admins...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
            <p className="text-gray-600 mt-1">Manage admins and their permissions</p>
          </div>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-medium shadow-md hover:shadow-lg"
        >
          <Plus size={20} />
          Add New Admin
        </button>
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
        />
      )}

      {/* Admin List Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        {admins.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Users size={32} className="text-blue-600" />
            </div>
            <p className="text-gray-600 text-lg font-medium">No admins yet</p>
            <p className="text-gray-500 text-sm mt-2">Create your first admin to get started.</p>
            <button
              onClick={handleAddNew}
              className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium"
            >
              <Plus size={18} />
              Create First Admin
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Admin</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Created</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-blue-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {admin.profile_image_url ? (
                          <img
                            src={admin.profile_image_url}
                            alt={admin.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-blue-100">
                            <span className="text-white font-bold text-sm">
                              {admin.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{admin.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{admin.email}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{admin.phone || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(admin.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(admin)}
                          className="p-2 hover:bg-blue-200 text-blue-600 rounded-lg transition duration-200"
                          title="Edit admin"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(admin.id)}
                          className="p-2 hover:bg-red-200 text-red-600 rounded-lg transition duration-200"
                          title="Delete admin"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
