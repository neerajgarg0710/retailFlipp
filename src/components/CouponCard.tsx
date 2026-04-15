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
  const storeName = coupon.stores?.name ?? 'Unknown store'
  const logoUrl = coupon.stores?.logo_url
  const fallbackInitial = storeName.charAt(0).toUpperCase()
  const valueLabel = coupon.discount_value ? `${coupon.discount_value} ${discountLabel}` : discountLabel
  const codeLabel = coupon.coupon_code ?? 'Coupon code'

  return (
    <div className="coupon-card">
      <div className="coupon-card-hero">
        <span className="coupon-badge">{valueLabel}</span>
        <div className="coupon-logo-shell">
          {logoUrl ? (
            <img className="coupon-store-logo" src={logoUrl} alt={`${storeName} logo`} />
          ) : (
            <div className="coupon-store-logo coupon-store-logo-fallback" aria-hidden="true">
              {fallbackInitial}
            </div>
          )}
        </div>
      </div>

      <div className="coupon-divider" />

      <div className="coupon-card-body">
        <p className="coupon-store">{storeName}</p>
        <h2>{coupon.title}</h2>
        <button className="coupon-code-pill" type="button">
          {codeLabel}
        </button>
      </div>

      <div className="coupon-meta compact">
        <span className={`coupon-tag ${coupon.is_verified ? 'verified' : 'unverified'}`}>
          {coupon.is_verified ? 'Verified' : 'Unverified'}
        </span>
        {coupon.is_exclusive && <span className="coupon-tag exclusive">Exclusive</span>}
        <span className="coupon-expiry">Expires {expiration}</span>
      </div>
    </div>
  )
}
