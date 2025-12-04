import { useState, useEffect } from 'react'
import type { AdminPermissions } from '@/types'
import { productService } from '@/services/productService'
import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'
import { AlertCircle } from 'lucide-react'

interface ProductAccessGroupProps {
  permissions: Partial<AdminPermissions>
  onChange: (key: string, value: any) => void
}

export default function ProductAccessGroup({
  permissions,
  onChange,
}: ProductAccessGroupProps) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (permissions.can_view_products) {
      loadProducts()
    }
  }, [permissions.can_view_products])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await productService.getAllProducts()
      setProducts(data)
    } catch (err) {
      setError('Failed to load products')
      console.error('Failed to load products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckboxChange = (key: string, checked: boolean) => {
    onChange(key, checked)
    if (key === 'can_view_products' && !checked) {
      onChange('assigned_product_ids', [])
    }
  }

  const handleProductSelect = (productId: string, checked: boolean) => {
    const current = permissions.assigned_product_ids || []
    const updated = checked
      ? [...current, productId]
      : current.filter(id => id !== productId)
    onChange('assigned_product_ids', updated)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-gray-900">Product Access</h4>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Optional</span>
      </div>

      <div className="space-y-4">
        {/* View Products Checkbox */}
        <div className="flex items-center gap-3">
          <Checkbox
            id="can_view_products"
            checked={permissions.can_view_products || false}
            onCheckedChange={(checked) => handleCheckboxChange('can_view_products', checked as boolean)}
          />
          <Label htmlFor="can_view_products" className="cursor-pointer font-medium">
            View Product Page
          </Label>
        </div>

        {/* Conditional: Create Product Checkbox */}
        {permissions.can_view_products && (
          <div className="ml-6 space-y-4 pt-2 border-l-2 border-blue-200 pl-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="can_create_products"
                checked={permissions.can_create_products || false}
                onCheckedChange={(checked) => handleCheckboxChange('can_create_products', checked as boolean)}
              />
              <Label htmlFor="can_create_products" className="cursor-pointer font-medium">
                Create Product
              </Label>
            </div>

            {/* Assign Products Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="assign_products"
                  checked={(permissions.assigned_product_ids?.length || 0) > 0}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      onChange('assigned_product_ids', [])
                    }
                  }}
                />
                <Label htmlFor="assign_products" className="cursor-pointer font-medium">
                  Assign Specific Products
                </Label>
              </div>

              {(permissions.assigned_product_ids?.length || 0) > 0 && (
                <div className="ml-6 space-y-2">
                  {loading ? (
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      Loading products...
                    </div>
                  ) : error ? (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-gray-500 text-sm">No products available</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                      {products.map((product) => (
                        <div key={product.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`product-${product.id}`}
                            checked={(permissions.assigned_product_ids || []).includes(product.id)}
                            onCheckedChange={(checked) => handleProductSelect(product.id, checked as boolean)}
                          />
                          <Label htmlFor={`product-${product.id}`} className="cursor-pointer text-sm flex-1">
                            <div className="flex justify-between items-start">
                              <span>{product.name}</span>
                              <span className="text-gray-500 text-xs">${product.price?.toFixed(2) || '0.00'}</span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
