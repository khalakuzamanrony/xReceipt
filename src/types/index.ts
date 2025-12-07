// User types
export type UserRole = 'grand_user' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: UserRole
  profile_image_url?: string
  created_at: string
  updated_at: string
}

// Admin Permissions
export interface AdminPermissions {
  id: string
  admin_id: string
  
  // Product permissions
  can_view_products: boolean
  can_create_products: boolean
  assigned_product_ids: string[]
  
  // Category permissions
  can_view_categories: boolean
  can_create_categories: boolean
  can_assign_categories: boolean
  assigned_category_ids: string[]
  
  // Receipt permissions
  can_view_receipts: boolean
  can_create_receipts: boolean
  can_assign_receipt_templates: boolean
  
  // Template permissions
  can_view_templates: boolean
  can_create_templates: boolean
  can_assign_templates: boolean
  assigned_template_ids: string[]
  
  created_at: string
  updated_at: string
}

// Product types
export interface Product {
  id: string
  name: string
  description?: string
  price: number
  category_id: string
  image_url?: string
  vendor_id?: string | null
  created_at: string
  updated_at: string
}

// Category types
export interface Category {
  id: string
  name: string
  parent_id?: string | null
  image_url?: string
  vendor_id?: string | null
  created_at: string
  updated_at: string
}

// Receipt Template types
export interface ReceiptTemplate {
  id: string
  name: string
  description?: string
  template_html: string
  created_by: string
  vendor_id?: string | null
  created_at: string
  updated_at: string
}

// Receipt types
export interface Receipt {
  id: string
  receipt_number: string
  customer_name: string
  customer_email: string
  customer_company?: string
  customer_phone?: string
  customer_address?: string
  template_id: string
  vendor_id?: string | null
  subtotal?: number
  tax?: number
  total?: number
  status: 'draft' | 'sent' | 'paid'
  items?: ReceiptItem[]
  created_at: string
  updated_at: string
}

export interface ReceiptItem {
  id: string
  product_id: string
  name: string
  quantity: number
  unit_price: number
  total: number
}

// Form types
export interface CreateAdminFormData {
  name: string
  email: string
  phone?: string
  profile_image?: File
  permissions: AdminPermissions
}

export interface CreateReceiptFormData {
  template_id: string
  items: ReceiptItem[]
  customer_name?: string
  customer_email?: string
  customer_company?: string
  customer_phone?: string
  customer_address?: string
  notes?: string
}

export type VendorStatus = 'active' | 'inactive'

export interface Vendor {
  id: string
  vendor_id: string
  name: string
  email: string
  address?: string | null
  url?: string | null
  status: VendorStatus
  image_url?: string | null
  admin_id?: string | null
  created_at: string
  updated_at: string
}

export interface VendorAdmin {
  id: string
  vendor_id: string
  admin_id: string
  is_vendor_super_admin: boolean
  created_at: string
  updated_at: string
}
