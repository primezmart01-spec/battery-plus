export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'customer' | 'admin' | 'super_admin';
  status: 'active' | 'disabled' | 'deleted';
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  description: string;
  seo_title?: string;
  seo_description?: string;
  display_order: number;
  product_count?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_id?: string | null;
  display_order: number;
  product_count?: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  title: string;
  ah_capacity?: number;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  warranty_months: number;
  weight?: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
  is_primary: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand_id: string;
  brand_name: string;
  brand_slug: string;
  brand_logo?: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  sku: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_featured: number;
  is_bestseller: number;
  is_new_arrival: number;
  battery_type: string;
  voltage: string;
  ah_capacity: number;
  cca?: number;
  plates?: number;
  dimensions?: string;
  weight?: number;
  warranty_months: number;
  manufacturer?: string;
  short_desc?: string;
  description?: string;
  features: string[];
  delivery_info?: string;
  return_info?: string;
  primary_image?: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
  compatibleVehicles?: any[];
  avg_rating?: number;
  avgRating?: number;
  reviews_count?: number;
  reviewsCount?: number;
  reviews?: Review[];
  related?: Product[];
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  brandName: string;
  variantId?: string;
  variantTitle?: string;
  unitPrice: number;
  originalPrice: number;
  quantity: number;
  maxStock: number;
  isOutOfStock: boolean;
  subtotal: number;
  warrantyMonths: number;
  ahCapacity: number;
  voltage: string;
  imageUrl?: string;
}

export interface Address {
  id: string;
  user_id?: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  area?: string;
  province: string;
  postal_code?: string;
  delivery_instructions?: string;
  is_default_shipping: number;
  is_default_billing: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  product_title: string;
  title?: string;
  sku: string;
  ah_capacity?: number;
  voltage?: string;
  warranty_months?: number;
  unit_price: number;
  quantity: number;
  subtotal_price: number;
  product_image?: string;
  image_url?: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  subtotal: number;
  discount: number;
  shipping_amount: number;
  tax_amount: number;
  total_amount: number;
  coupon_code?: string;
  payment_method: 'cod' | 'payfast' | 'card' | 'jazzcash' | 'easypaisa' | 'bank_transfer';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  order_status: 'pending' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded';
  shipping_notes?: string;
  tracking_number?: string;
  transaction_reference?: string;
  transactionReference?: string;
  created_at: number;
  updated_at: number;
  items?: OrderItem[];
  shippingAddress?: any;
  billingAddress?: any;
  shipping_address?: any;
  billing_address?: any;
  timeline?: any[];
  payment?: any;
}

export interface Review {
  id: string;
  product_id: string;
  product_name?: string;
  product_slug?: string;
  customer_name: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: number;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount?: number;
  usage_limit?: number;
  times_used: number;
  start_date: number;
  end_date: number;
  is_active: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  cta_text?: string;
  cta_link?: string;
  display_order: number;
}
