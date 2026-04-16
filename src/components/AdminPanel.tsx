import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Category, DiscountType, NewCoupon } from '../types'

interface AdminPanelProps {
  coupon: NewCoupon
  categories: Category[]
  isEditing: boolean
  onChange: (field: keyof NewCoupon, value: string | boolean | File | null) => void
  onCategoryChange: (categoryIds: string[]) => void
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
  onCategoryChange,
  onCancelEdit,
  onFileChange,
  onSubmit
}: AdminPanelProps) {
  const [availableSelection, setAvailableSelection] = useState<string[]>([])
  const [selectedSelection, setSelectedSelection] = useState<string[]>([])

  const availableCategories = useMemo(
    () => categories.filter((category) => !coupon.categoryIds.includes(category.id)),
    [categories, coupon.categoryIds]
  )

  const selectedCategories = useMemo(
    () => categories.filter((category) => coupon.categoryIds.includes(category.id)),
    [categories, coupon.categoryIds]
  )

  const handleAddCategories = () => {
    if (availableSelection.length === 0) {
      return
    }

    onCategoryChange([...coupon.categoryIds, ...availableSelection])
    setAvailableSelection([])
  }

  const handleRemoveCategories = () => {
    if (selectedSelection.length === 0) {
      return
    }

    onCategoryChange(coupon.categoryIds.filter((categoryId) => !selectedSelection.includes(categoryId)))
    setSelectedSelection([])
  }

  return (
    <div className="admin-panel">
      <div className="admin-form-header">
        <div>
          <h2 id="admin-coupon-modal-title">{isEditing ? 'Edit Coupon' : 'Add New Coupon'}</h2>
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
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Rank (1 = highest priority)"
          value={coupon.rank}
          onChange={(e) => onChange('rank', e.target.value)}
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
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={coupon.isLimitedTime}
            onChange={(e) => onChange('isLimitedTime', e.target.checked)}
          />
          Limited Time
        </label>
        <div className="admin-category-picker">
          <span className="admin-category-label">Categories</span>
          {categories.length === 0 ? (
            <p className="admin-category-empty">No categories found. Add category rows in Supabase first.</p>
          ) : (
            <div className="admin-category-transfer">
              <div className="admin-category-column">
                <span className="admin-category-subtitle">Available</span>
                <select
                  className="admin-category-select"
                  multiple
                  value={availableSelection}
                  onChange={(e) => setAvailableSelection(Array.from(e.target.selectedOptions, (option) => option.value))}
                >
                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-category-transfer-actions">
                <button
                  type="button"
                  className="admin-transfer-btn"
                  onClick={handleAddCategories}
                  disabled={availableSelection.length === 0}
                >
                  Add to Selected
                </button>
                <button
                  type="button"
                  className="admin-transfer-btn"
                  onClick={handleRemoveCategories}
                  disabled={selectedSelection.length === 0}
                >
                  Remove from Selected
                </button>
              </div>

              <div className="admin-category-column">
                <span className="admin-category-subtitle">Selected</span>
                <select
                  className="admin-category-select"
                  multiple
                  value={selectedSelection}
                  onChange={(e) => setSelectedSelection(Array.from(e.target.selectedOptions, (option) => option.value))}
                >
                  {selectedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        <input
          type="date"
          value={coupon.endAt}
          onChange={(e) => onChange('endAt', e.target.value)}
        />
        <button type="submit">{isEditing ? 'Update Coupon' : 'Add Coupon'}</button>
      </form>
    </div>
  )
}
