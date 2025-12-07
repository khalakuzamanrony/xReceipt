import { useEffect, useState } from 'react'
import type { Vendor, User } from '@/types'
import { vendorService } from '@/services/vendorService'
import { vendorAdminService } from '@/services/vendorAdminService'
import { adminService } from '@/services/adminService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Plus, Edit, Trash2, AlertCircle, Store, Search, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function VendorList() {
  const { role } = useAuth()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [showAdminsDialog, setShowAdminsDialog] = useState(false)
  const [adminsVendor, setAdminsVendor] = useState<Vendor | null>(null)
  const [assignedAdminIds, setAssignedAdminIds] = useState<string[]>([])
  const [superAdminIds, setSuperAdminIds] = useState<string[]>([])
  const [savingAdmins, setSavingAdmins] = useState(false)
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

  useEffect(() => {
    loadData()
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
      setError(err instanceof Error ? err.message : 'Failed to load vendor admins')
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
      setShowAdminsDialog(false)
      setAdminsVendor(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor admins')
    } finally {
      setSavingAdmins(false)
    }
  }

  const filteredVendors = vendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.vendor_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return

    try {
      await vendorService.deleteVendor(id)
      setVendors(vendors.filter(v => v.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vendor')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.vendor_id || !formData.name || !formData.email) {
      setError('Vendor ID, name, and email are required')
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
        await vendorService.updateVendor(selectedVendor.id, payload)
      } else {
        const createdVendor = await vendorService.createVendor(payload as any)

        try {
          const superAdmin = await adminService.createVendorSuperAdminForVendor(createdVendor)
          // Set as primary admin on vendor
          await vendorService.updateVendor(createdVendor.id, { admin_id: superAdmin.id })
          // Assign as vendor super admin in vendor_admins mapping
          await vendorAdminService.saveAdminsForVendor(createdVendor.id, [
            { admin_id: superAdmin.id, is_vendor_super_admin: true },
          ])
        } catch (autoError) {
          console.error('Failed to create vendor super admin:', autoError)
          setError('Vendor created but failed to create default vendor super user. Please create an admin manually.')
        }
      }

      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor')
    }
  }

  const getAdminName = (adminId?: string | null) => {
    if (!adminId) return 'Unassigned'
    return admins.find(a => a.id === adminId)?.name || 'Unknown admin'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading vendors...</p>
      </div>
    )
  }

  if (role !== 'grand_user') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Store size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">You don't have access to Vendors</p>
        <p className="text-gray-500 text-sm mt-1">Only Grand Users can manage vendors.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Title and Buttons */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
            <p className="text-sm text-gray-500 mt-1">Manage vendors / shops and their assigned admins</p>
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 sm:w-64 bg-white rounded-lg border border-gray-200 h-9 px-3 flex items-center gap-2">
              <Search size={18} className="text-gray-400" />
              <Input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-9 border-0 focus:ring-0 px-0 py-0 text-sm"
              />
            </div>

            {/* Add Button */}
            <Button onClick={handleAddNew} size="sm">
              <Plus size={16} />
              Add Vendor
            </Button>
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
          <DialogContent className="max-w-lg bg-white">
            <DialogHeader className="border-b border-gray-200 pb-4">
              <DialogTitle className="text-xl font-bold text-gray-900">
                {selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor_id" className="text-sm font-semibold text-gray-900">Vendor ID *</Label>
                  <Input
                    id="vendor_id"
                    type="text"
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    placeholder="Unique vendor code"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-900">Vendor Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Vendor name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-900">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendor@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm font-semibold text-gray-900">Vendor URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://vendor-site.com"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-sm font-semibold text-gray-900">Address</Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Vendor address"
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
                  <Label htmlFor="image_url" className="text-sm font-semibold text-gray-900">Vendor Image URL</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="Optional logo/image URL"
                  />
                </div>
              </div>

              <DialogFooter className="gap-3 border-t border-gray-200 pt-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
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
                        <span className="text-xs text-gray-700">Vendor super admin</span>
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
      {filteredVendors.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
          <Store size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            {searchTerm ? 'No vendors found' : 'No vendors yet'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Create your first vendor to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vendor ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">URL</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned Admin</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVendors.map((vendor) => (
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
                        <span className="text-sm font-medium text-gray-900">{vendor.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{vendor.vendor_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{vendor.email}</p>
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
                      <p className="text-sm text-gray-600">{getAdminName(vendor.admin_id)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(vendor)}
                          title="Edit"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageAdmins(vendor)}
                          title="Manage admins"
                        >
                          <Users size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(vendor.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
