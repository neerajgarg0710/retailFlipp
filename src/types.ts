export type DiscountType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING' | 'CASHBACK'
export type CouponStatus = 'ACTIVE' | 'EXPIRED' | 'DISABLED'

export interface Store {
  id: string
  name: string
}

export interface Coupon {
  id: string
  title: string
  description: string | null
  coupon_code: string | null
  discount_type: DiscountType | null
  discount_value: string | null
  url: string | null
  end_at: string
  is_verified: boolean
  is_exclusive: boolean
  status: CouponStatus
  created_at: string | null
  updated_at: string | null
  stores?: Store | null
}

export interface NewCoupon {
  title: string
  storeName: string
  discountType: DiscountType
  discountValue: string
  code: string
  description: string
  url: string
  endAt: string
}