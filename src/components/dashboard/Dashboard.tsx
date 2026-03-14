import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useVendor } from '@/contexts/VendorContext'
import { adminService } from '@/services/adminService'
import { productService } from '@/services/productService'
import { categoryService } from '@/services/categoryService'
import { templateService } from '@/services/templateService'
import { receiptService } from '@/services/receiptService'
import { CheckCircle2, Clock, FileCode, FileText, Package, Send, Users } from 'lucide-react'

type DateRangeId = 'today' | '7d' | '30d' | 'all'

type ReceiptStatus = 'draft' | 'sent' | 'paid'

type StatusSummary = Record<ReceiptStatus, { count: number; amount: number }>

interface TopProductRow {
  name: string
  quantity: number
  revenue: number
}

export default function Dashboard() {
  const { role } = useAuth()
  const { memberships, activeVendorId, permissions, loading: vendorLoading, error: vendorError } = useVendor()

  const [dateRange, setDateRange] = useState<DateRangeId>('30d')

  const [stats, setStats] = useState({
    admins: 0,
    products: 0,
    categories: 0,
    templates: 0,
    receipts: 0,
    revenue: 0,
    avgReceipt: 0,
    status: {
      draft: { count: 0, amount: 0 },
      sent: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
    } as StatusSummary,
  })

  const [recentReceipts, setRecentReceipts] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<TopProductRow[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeVendorName = useMemo(() => {
    if (!activeVendorId) return null
    const match = memberships.find((m) => m.vendor.id === activeVendorId)
    return match?.vendor?.name ?? null
  }, [activeVendorId, memberships])

  const isAdmin = role === 'admin' || role === 'super_admin'
  const adminPermissionFallback = isAdmin && !permissions

  // Dashboard should always show shop-scoped metrics for admins.
  // Permissions can still be enforced in the feature pages (receipts/products/etc).
  const canViewReceipts = role === 'grand_user' || isAdmin || permissions?.can_view_receipts || adminPermissionFallback
  const canViewProducts = role === 'grand_user' || isAdmin || permissions?.can_view_products || adminPermissionFallback
  const canViewCategories = role === 'grand_user' || isAdmin || permissions?.can_view_categories || adminPermissionFallback
  const canViewTemplates = role === 'grand_user' || isAdmin || adminPermissionFallback

  const canCreateReceipts = role === 'grand_user' || isAdmin || permissions?.can_create_receipts || adminPermissionFallback
  const canCreateProducts = role === 'grand_user' || isAdmin || permissions?.can_create_products || adminPermissionFallback
  const canCreateUsers = role === 'grand_user'

  const runQuickCreate = (type: 'receipt' | 'product' | 'user') => {
    if (typeof window === 'undefined') return

    const page = type === 'receipt' ? 'receipts' : type === 'product' ? 'products' : 'admin'
    window.localStorage.setItem('xreceipt.quickCreate', type)
    window.dispatchEvent(new CustomEvent('xreceipt:navigate', { detail: { page } }))
  }

  useEffect(() => {
    void loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVendorId, dateRange, role])

  const getStartDate = (range: DateRangeId) => {
    const now = new Date()
    if (range === 'all') return null
    if (range === 'today') {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      return d
    }
    const days = range === '7d' ? 7 : 30
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    return d
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'BDT',
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const activeVendorAllowed = !activeVendorId || memberships.some((m) => m.vendor.id === activeVendorId)

      if (isAdmin && (!activeVendorId || !activeVendorAllowed)) {
        setStats({
          admins: 0,
          products: 0,
          categories: 0,
          templates: 0,
          receipts: 0,
          revenue: 0,
          avgReceipt: 0,
          status: {
            draft: { count: 0, amount: 0 },
            sent: { count: 0, amount: 0 },
            paid: { count: 0, amount: 0 },
          } as StatusSummary,
        })
        setRecentReceipts([])
        setTopProducts([])
        return
      }

      const startDate = getStartDate(dateRange)

      const [adminsCount, products, categories, templates, receipts] = await Promise.all([
        (async () => {
          if (!activeVendorId) {
            const admins = await adminService.getAllAdmins()
            return admins.length
          }
          const { data, error: adminCountError } = await supabase
            .from('vendor_admins')
            .select('admin_id')
            .eq('vendor_id', activeVendorId)

          if (adminCountError) throw adminCountError
          const ids = Array.from(new Set((data || []).map((row: any) => row.admin_id).filter(Boolean)))
          return ids.length
        })(),
        canViewProducts ? productService.getAllProducts(activeVendorId ?? undefined) : Promise.resolve([]),
        canViewCategories ? categoryService.getAllCategories(activeVendorId ?? undefined) : Promise.resolve([]),
        canViewTemplates ? templateService.getAllTemplates(activeVendorId ?? undefined) : Promise.resolve([]),
        canViewReceipts ? receiptService.getAllReceipts(activeVendorId ?? undefined) : Promise.resolve([]),
      ])

      const filteredReceipts = (receipts || []).filter((r: any) => {
        if (!startDate) return true
        const createdAt = r?.created_at ? new Date(r.created_at) : null
        if (!createdAt) return false
        return createdAt.getTime() >= startDate.getTime()
      })

      const status: StatusSummary = {
        draft: { count: 0, amount: 0 },
        sent: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
      }

      let revenue = 0
      for (const r of filteredReceipts) {
        const total = typeof r.total === 'number' ? r.total : Number(r.total || 0)
        revenue += total
        const st = (r.status || 'draft') as ReceiptStatus
        if (st === 'draft' || st === 'sent' || st === 'paid') {
          status[st].count += 1
          status[st].amount += total
        }
      }

      const receiptsCount = filteredReceipts.length
      const avgReceipt = receiptsCount > 0 ? revenue / receiptsCount : 0

      setStats({
        admins: adminsCount,
        products: products.length,
        categories: categories.length,
        templates: templates.length,
        receipts: receiptsCount,
        revenue,
        avgReceipt,
        status,
      })

      const recent = filteredReceipts
        .slice()
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8)

      setRecentReceipts(recent)

      // Top products for current range
      if (canViewReceipts) {
        const receiptIds = filteredReceipts.map((r: any) => r.id).filter(Boolean)
        if (receiptIds.length) {
          const { data: items, error: itemsError } = await supabase
            .from('receipt_items')
            .select('name, quantity, total, receipt_id')
            .in('receipt_id', receiptIds)

          if (itemsError) throw itemsError

          const byName = new Map<string, TopProductRow>()
          for (const row of items || []) {
            const name = (row as any).name as string
            if (!name) continue
            const qty = typeof (row as any).quantity === 'number' ? (row as any).quantity : Number((row as any).quantity || 0)
            const total = typeof (row as any).total === 'number' ? (row as any).total : Number((row as any).total || 0)
            const existing = byName.get(name)
            if (existing) {
              existing.quantity += qty
              existing.revenue += total
            } else {
              byName.set(name, { name, quantity: qty, revenue: total })
            }
          }

          const top = Array.from(byName.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8)

          setTopProducts(top)
        } else {
          setTopProducts([])
        }
      } else {
        setTopProducts([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load statistics'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const statusTotalCount = stats.status.draft.count + stats.status.sent.count + stats.status.paid.count

  if (vendorLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-5 w-16 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeVendorName ? `Overview for ${activeVendorName}` : 'Select a shop to see shop-specific metrics'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'today' as const, label: 'Today' },
            { id: '7d' as const, label: '7 Days' },
            { id: '30d' as const, label: '30 Days' },
            { id: 'all' as const, label: 'All time' },
          ].map((opt) => (
            <Button
              key={opt.id}
              type="button"
              variant={dateRange === opt.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(opt.id)}
              className={cn(
                'h-9',
                dateRange === opt.id
                  ? 'bg-violet-600 hover:bg-violet-700 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {(vendorError || error) && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg">
          <p className="font-semibold">Error loading statistics</p>
          <p className="text-sm mt-1">{vendorError || error}</p>
        </div>
      )}

      {!activeVendorId && (
        <div className="bg-violet-50 border border-violet-200 text-violet-800 px-4 py-4 rounded-lg">
          <p className="font-semibold">Choose a shop</p>
          <p className="text-sm mt-1">
            Select a shop from the header to view receipts, revenue, and catalog metrics for that shop.
          </p>
        </div>
      )}

      {(canCreateReceipts || canCreateProducts || canCreateUsers) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {canCreateReceipts && (
                <Button
                  type="button"
                  onClick={() => runQuickCreate('receipt')}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create receipt
                </Button>
              )}
              {canCreateProducts && (
                <Button type="button" variant="outline" onClick={() => runQuickCreate('product')}>
                  <Package className="h-4 w-4 mr-2" />
                  Create product
                </Button>
              )}
              {canCreateUsers && (
                <Button type="button" variant="outline" onClick={() => runQuickCreate('user')}>
                  <Users className="h-4 w-4 mr-2" />
                  Create user
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receipts</CardTitle>
            <FileText className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{canViewReceipts ? stats.receipts : '—'}</div>
            <p className="text-xs text-gray-500 mt-1">In selected range</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <span className="h-4 w-4 inline-flex items-center justify-center text-green-600 font-semibold">
              ৳
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{canViewReceipts ? formatCurrency(stats.revenue) : '—'}</div>
            <p className="text-xs text-gray-500 mt-1">Total receipt amount</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg receipt</CardTitle>
            <span className="h-4 w-4 inline-flex items-center justify-center text-emerald-600 font-semibold">
              ৳
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{canViewReceipts ? formatCurrency(stats.avgReceipt) : '—'}</div>
            <p className="text-xs text-gray-500 mt-1">Average value</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-gray-500 mt-1">Total users in system</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canViewReceipts ? (
              <p className="text-sm text-gray-500">You don’t have permission to view receipts.</p>
            ) : statusTotalCount === 0 ? (
              <p className="text-sm text-gray-500">No receipts found in this range.</p>
            ) : (
              <div className="space-y-3">
                {[{
                  id: 'draft' as const,
                  label: 'Draft',
                  icon: Clock,
                  color: 'bg-gray-200',
                  text: 'text-gray-700',
                }, {
                  id: 'sent' as const,
                  label: 'Sent',
                  icon: Send,
                  color: 'bg-violet-200',
                  text: 'text-violet-700',
                }, {
                  id: 'paid' as const,
                  label: 'Paid',
                  icon: CheckCircle2,
                  color: 'bg-green-200',
                  text: 'text-green-700',
                }].map((row) => {
                  const Icon = row.icon
                  const count = stats.status[row.id].count
                  const amount = stats.status[row.id].amount
                  const pct = statusTotalCount ? Math.round((count / statusTotalCount) * 100) : 0
                  return (
                    <div key={row.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('h-4 w-4', row.text)} />
                          <span className="text-sm font-medium text-gray-900">{row.label}</span>
                          <span className="text-xs text-gray-500">({count})</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className={cn('h-2 rounded-full', row.color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent receipts</CardTitle>
            <span className="text-xs text-gray-500">Latest 8</span>
          </CardHeader>
          <CardContent>
            {!canViewReceipts ? (
              <p className="text-sm text-gray-500">You don’t have permission to view receipts.</p>
            ) : recentReceipts.length === 0 ? (
              <p className="text-sm text-gray-500">No receipts to show for this range.</p>
            ) : (
              <>
                {/* Mobile list */}
                <div className="md:hidden divide-y divide-gray-100">
                  {recentReceipts.map((r: any) => {
                    const st = (r.status || 'draft') as ReceiptStatus
                    const badge =
                      st === 'paid'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : st === 'sent'
                          ? 'bg-violet-50 text-violet-700 border-violet-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'

                    return (
                      <div key={r.id} className="py-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {r.receipt_number || r.id?.slice(0, 8)}
                            </p>
                            <p className="text-xs text-gray-600 truncate">{r.customer_name || '—'}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                              {formatCurrency(Number(r.total || 0))}
                            </p>
                            <p className="text-[11px] text-gray-500 whitespace-nowrap">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold', badge)}>
                            {st.charAt(0).toUpperCase() + st.slice(1)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                        <th className="py-2 pr-4">Receipt</th>
                        <th className="py-2 pr-4">Customer</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4 text-right">Total</th>
                        <th className="py-2 pr-0 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReceipts.map((r: any) => {
                        const st = (r.status || 'draft') as ReceiptStatus
                        const badge =
                          st === 'paid'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : st === 'sent'
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'

                        return (
                          <tr key={r.id} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 pr-4 font-medium text-gray-900 whitespace-nowrap">
                              {r.receipt_number || r.id?.slice(0, 8)}
                            </td>
                            <td className="py-2 pr-4 text-gray-700">
                              {r.customer_name || '—'}
                            </td>
                            <td className="py-2 pr-4">
                              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold', badge)}>
                                {st.charAt(0).toUpperCase() + st.slice(1)}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-right font-semibold text-gray-900 whitespace-nowrap">
                              {formatCurrency(Number(r.total || 0))}
                            </td>
                            <td className="py-2 pr-0 text-right text-gray-600 whitespace-nowrap">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Top products</CardTitle>
            <span className="text-xs text-gray-500">By revenue</span>
          </CardHeader>
          <CardContent>
            {!canViewReceipts ? (
              <p className="text-sm text-gray-500">You don’t have permission to view receipts.</p>
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-gray-500">Not enough data to compute top products for this range.</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p) => (
                  <div key={p.name} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">Qty {p.quantity}</p>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatCurrency(p.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Catalog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700">Products</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{canViewProducts ? stats.products : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-gray-700">Templates</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{canViewTemplates ? stats.templates : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-600" />
                <span className="text-sm text-gray-700">Categories</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{canViewCategories ? stats.categories : '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
