import { type KeyboardEvent, type MouseEvent, useEffect, useState } from 'react'
import type { Coupon } from '../types'

interface CouponCardProps {
  coupon: Coupon
}

const formatDiscount = (discountType: string | null | undefined) => {
  if (!discountType) return 'Deal'
  return discountType.replace('_', ' ').toLowerCase()
}

export default function CouponCard({ coupon }: CouponCardProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const expirationLabel = coupon.end_at ? `Expires ${new Date(coupon.end_at).toLocaleDateString()}` : 'No expiry'
  const isExpired = coupon.status === 'EXPIRED' || (coupon.end_at ? new Date(coupon.end_at).getTime() < Date.now() : false)
  const discountLabel = formatDiscount(coupon.discount_type)
  const storeName = coupon.stores?.name ?? 'Unknown store'
  const logoUrl = coupon.stores?.logo_url
  const affiliateUrl = coupon.url?.trim() ?? ''
  const hasAffiliateUrl = affiliateUrl.length > 0
  const fallbackInitial = storeName.charAt(0).toUpperCase()
  const valueLabel = coupon.discount_value ? `${coupon.discount_value} ${discountLabel}` : discountLabel
  const hasCouponCode = Boolean(coupon.coupon_code)
  const codeLabel =
    copyState === 'copied'
      ? 'Copied'
      : copyState === 'error'
        ? 'Copy failed'
        : coupon.coupon_code ?? 'Auto apply'

  useEffect(() => {
    if (copyState === 'idle') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState('idle')
    }, 1600)

    return () => window.clearTimeout(timeoutId)
  }, [copyState])

  const handleCopyCode = async () => {
    if (!coupon.coupon_code) {
      return
    }

    try {
      await navigator.clipboard.writeText(coupon.coupon_code)
      setCopyState('copied')
    } catch (error) {
      console.error('Copy coupon code failed:', error)
      setCopyState('error')
    }
  }

  const handleOpenAffiliateLink = () => {
    if (!hasAffiliateUrl) {
      return
    }

    window.open(affiliateUrl, '_blank', 'noopener,noreferrer')
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!hasAffiliateUrl) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpenAffiliateLink()
    }
  }

  const handleCodeButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    void handleCopyCode()
  }

  return (
    <div
      className={`coupon-card ${isExpired ? 'coupon-card-expired' : ''} ${hasAffiliateUrl ? 'coupon-card-linkable' : ''}`}
      onClick={handleOpenAffiliateLink}
      onKeyDown={handleCardKeyDown}
      role={hasAffiliateUrl ? 'link' : undefined}
      tabIndex={hasAffiliateUrl ? 0 : undefined}
      aria-label={hasAffiliateUrl ? `Open offer for ${storeName} in a new tab` : undefined}
    >
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
        <button
          className={`coupon-code-pill ${hasCouponCode ? 'copyable' : 'static'}`}
          type="button"
          onClick={handleCodeButtonClick}
          disabled={!hasCouponCode}
        >
          {codeLabel}
        </button>
      </div>

      <div className="coupon-meta compact">
        {isExpired && <span className="coupon-tag expired">Expired</span>}
        <span className={`coupon-tag ${coupon.is_verified ? 'verified' : 'unverified'}`}>
          {coupon.is_verified ? 'Verified' : 'Unverified'}
        </span>
        {coupon.is_exclusive && <span className="coupon-tag exclusive">Exclusive</span>}
        {coupon.is_limited_time && <span className="coupon-tag limited-time">Limited Time</span>}
        <span className="coupon-expiry">{expirationLabel}</span>
      </div>
    </div>
  )
}
