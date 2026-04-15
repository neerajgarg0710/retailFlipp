import type { Coupon } from '../types'

interface CouponCardProps {
  coupon: Coupon
}

export default function CouponCard({ coupon }: CouponCardProps) {
  return (
    <div className="coupon-card">
      <h2>{coupon.title}</h2>
      <p><strong>Store:</strong> {coupon.stores?.name ?? 'Unknown store'}</p>
      <p><strong>Type:</strong> {coupon.discount_type ?? 'Deal'}</p>
      {coupon.discount_value && <p><strong>Value:</strong> {coupon.discount_value}</p>}
      {coupon.coupon_code && <p><strong>Code:</strong> {coupon.coupon_code}</p>}
      {coupon.url && (
        <p>
          <strong>Link:</strong> <a href={coupon.url} target="_blank" rel="noreferrer">Visit</a>
        </p>
      )}
      <p>{coupon.description}</p>
      <p><strong>Expires:</strong> {new Date(coupon.end_at).toLocaleDateString()}</p>
      <p><strong>Status:</strong> {coupon.status}</p>
    </div>
  )
}
