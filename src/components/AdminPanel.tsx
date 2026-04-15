import type { FormEvent, ChangeEvent } from 'react'
import type { NewCoupon, DiscountType, Category } from '../types'

interface AdminPanelProps {
  coupon: NewCoupon
  categories: Category[]
  isEditing: boolean
  onChange: (field: keyof NewCoupon, value: string | boolean | File | null) => void
  onCategoryToggle: (categoryId: string) => void
  onCancelEdit: () => void
  onFileChange: (file: File | null) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

const discountTypes: DiscountType[] = ['PERCENT', 'FIXED', 'FREE_SHIPPING', 'CASHBACK']

export default function AdminPanel({
  coupon,
  categories,
  isEditing,
  onChange,
  onCategoryToggle,
  onCancelEdit,
  onFileChange,
  onSubmit
}: AdminPanelProps) {
  return (
    <div className="admin-panel">
      <div className="admin-form-header">
        <div>
          <h2>{isEditing ? 'Edit Coupon' : 'Add New Coupon'}</h2>
          <p>{isEditing ? 'Update the selected coupon and save the changes.' : 'Create a new coupon and publish it to the live list.'}</p>
        </div>
        {isEditing && (
          <button type="button" className="admin-secondary-btn" onClick={onCancelEdit}>
            Cancel Edit
          </button>
        )}
      </div>
      <form onSubmit={onSubmit} className="coupon-form">
        <input
          type="text"
          placeholder="Title"
          value={coupon.title}
          onChange={(e) => onChange('title', e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Store name"
          value={coupon.storeName}
          onChange={(e) => onChange('storeName', e.target.value)}
          required
        />
        <input
          type="url"
          placeholder="Store logo URL (optional)"
          value={coupon.logoUrl}
          onChange={(e) => onChange('logoUrl', e.target.value)}
        />
        <label className="file-upload-label">
          Store logo upload (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e: ChangeEvent<HTMLInputElement>) => onFileChange(e.target.files?.[0] ?? null)}
          />
        </label>
        <select
          value={coupon.discountType}
          onChange={(e) => onChange('discountType', e.target.value)}
          required
        >
          {discountTypes.map((type) => (
            <option key={type} value={type}>{type.replace('_', ' ')}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Discount value"
          value={coupon.discountValue}
          onChange={(e) => onChange('discountValue', e.target.value)}
          disabled={coupon.discountType === 'FREE_SHIPPING'}
          required={coupon.discountType !== 'FREE_SHIPPING'}
        />
        <input
          type="text"
          placeholder="Coupon code"
          value={coupon.code}
          onChange={(e) => onChange('code', e.target.value)}
        />
        <input
          type="url"
          placeholder="Affiliate / track link"
          value={coupon.url}
          onChange={(e) => onChange('url', e.target.value)}
        />
        <textarea
          placeholder="Description"
          value={coupon.description}
          onChange={(e) => onChange('description', e.target.value)}
          required
        />
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={coupon.isVerified}
            onChange={(e) => onChange('isVerified', e.target.checked)}
          />
          Verified coupon
        </label>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={coupon.isExclusive}
            onChange={(e) => onChange('isExclusive', e.target.checked)}
          />
          Exclusive offer
        </label>
        <div className="admin-category-picker">
          <span className="admin-category-label">Categories</span>
          <div className="admin-category-options">
            {categories.length === 0 ? (
              <p className="admin-category-empty">No categories found. Add category rows in Supabase first.</p>
            ) : (
              categories.map((category) => (
                <label key={category.id} className="admin-checkbox admin-checkbox-compact">
                  <input
                    type="checkbox"
                    checked={coupon.categoryIds.includes(category.id)}
                    onChange={() => onCategoryToggle(category.id)}
                  />
                  {category.name}
                </label>
              ))
            )}
          </div>
        </div>
        <input
          type="date"
          value={coupon.endAt}
          onChange={(e) => onChange('endAt', e.target.value)}
          required
        />
        <button type="submit">{isEditing ? 'Update Coupon' : 'Add Coupon'}</button>
      </form>
    </div>
  )
}
