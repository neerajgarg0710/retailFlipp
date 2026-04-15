import type { Coupon } from '../types'

interface CouponCardProps {
  coupon: Coupon
}

const formatDiscount = (discountType: string | null | undefined) => {
  if (!discountType) return 'Deal'
  return discountType.replace('_', ' ').toLowerCase()
}

export default function CouponCard({ coupon }: CouponCardProps) {
  const expiration = new Date(coupon.end_at).toLocaleDateString()
  const discountLabel = formatDiscount(coupon.discount_type)

  return (
    <div className="coupon-card">
      <div className="coupon-card-top">
        <div>
          <p className="coupon-store">{coupon.stores?.name ?? 'Unknown store'}</p>
          <h2>{coupon.title}</h2>
        </div>
        <span className="coupon-badge">{discountLabel}</span>
      </div>

      <p className="coupon-description">{coupon.description ?? 'Save with this offer today.'}</p>

      <div className="coupon-meta">
        <span className={`coupon-tag ${coupon.is_verified ? 'verified' : 'unverified'}`}>
          {coupon.is_verified ? 'Verified' : 'Unverified'}
        </span>
        {coupon.is_exclusive && <span className="coupon-tag exclusive">Exclusive</span>}
        <span className="coupon-expiry">Expires {expiration}</span>
      </div>

      <div className="coupon-code-block">
        <div>
          <span>Coupon Code</span>
          <strong>{coupon.coupon_code ?? 'AUTO APPLY'}</strong>
        </div>
        <div className="coupon-value">{coupon.discount_value ?? 'Save now'}</div>
      </div>

      <div className="coupon-footer">
        {coupon.url ? (
          <a href={coupon.url} target="_blank" rel="noreferrer" className="coupon-action">
            Show Deal
          </a>
        ) : (
          <button className="coupon-action disabled" disabled>
            No Link
          </button>
        )}
      </div>
    </div>
  )
}
