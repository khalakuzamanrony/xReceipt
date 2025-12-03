import { useState, useEffect } from 'react'
import type { AdminPermissions } from '@/types'
import { productService } from '@/services/productService'

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

  useEffect(() => {
    if (permissions.can_view_products) {
      loadProducts()
    }
  }, [permissions.can_view_products])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await productService.getAllProducts()
      setProducts(data)
    } catch (err) {
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

  const handleProductSelect = (productIds: string[]) => {
    onChange('assigned_product_ids', productIds)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <h4 className="font-semibold text-gray-900">Product Access</h4>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={permissions.can_view_products || false}
            onChange={(e) => handleCheckboxChange('can_view_products', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-gray-700">View Product Page</span>
        </label>

        {permissions.can_view_products && (
          <>
            <label className="flex items-center gap-3 cursor-pointer ml-6">
              <input
                type="checkbox"
                checked={permissions.can_create_products || false}
                onChange={(e) => handleCheckboxChange('can_create_products', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-gray-700">Create Product</span>
            </label>

            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Products
              </label>
              {loading ? (
                <div className="text-gray-500 text-sm">Loading products...</div>
              ) : (
                <select
                  multiple
                  value={permissions.assigned_product_ids || []}
                  onChange={(e) =>
                    handleProductSelect(
                      Array.from(e.target.selectedOptions, (option) => option.value)
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={Math.min(products.length, 5)}
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
