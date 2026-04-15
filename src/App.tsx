import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import './App.css'
import { supabase } from './shared/supabaseClient'
import { ADMIN_PASSWORD } from './shared/constants'
import type { Category, Coupon, NewCoupon, Store } from './types'
import AdminPanel from './components/AdminPanel'
import CouponCard from './components/CouponCard'
import SearchBar from './components/SearchBar'

const initialCouponState: NewCoupon = {
  title: '',
  storeName: '',
  logoUrl: '',
  logoFile: null,
  discountType: 'PERCENT',
  discountValue: '',
  code: '',
  description: '',
  url: '',
  endAt: '',
  isVerified: false,
  isExclusive: false,
  categoryIds: []
}

const faqItems = [
  {
    question: 'How can Retail Flipp help me save money when shopping online?',
    answer:
      'Retail Flipp brings together active coupon codes, limited-time deals, and store offers in one place so you can compare savings quickly before you check out.'
  },
  {
    question: 'How often are coupons and promo codes updated?',
    answer:
      'Offers are refreshed as new coupons are added, and expiring deals are sorted by end date so current savings are easier to spot.'
  },
  {
    question: 'Can I use Retail Flipp on mobile while shopping in store?',
    answer:
      'Yes. You can search for deals from your phone and check for savings before you buy online or while comparing prices in store.'
  }
]

const sanitizeStoreSlug = (storeName: string) =>
  storeName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const getFileExtension = (file: File) => {
  const fileNameExtension = file.name.split('.').pop()?.toLowerCase()

  if (fileNameExtension) {
    return fileNameExtension
  }

  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/webp') return 'webp'

  return 'png'
}

const isCouponExpired = (coupon: Pick<Coupon, 'end_at' | 'status'>) =>
  coupon.status === 'EXPIRED' || new Date(coupon.end_at).getTime() < Date.now()

const getCouponDiscountScore = (coupon: Pick<Coupon, 'discount_type' | 'discount_value'>) => {
  if (!coupon.discount_value) {
    return coupon.discount_type === 'FREE_SHIPPING' ? 1 : 0
  }

  const parsedValue = Number(coupon.discount_value)

  if (Number.isNaN(parsedValue)) {
    return 0
  }

  switch (coupon.discount_type) {
    case 'PERCENT':
      return parsedValue + 1000
    case 'FIXED':
      return parsedValue + 500
    case 'CASHBACK':
      return parsedValue + 250
    default:
      return parsedValue
  }
}

function App() {
  const location = useLocation()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState<'newest' | 'expiring' | 'best-discount'>('expiring')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [selectedStoreSlug, setSelectedStoreSlug] = useState<string | null>(null)
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null)
  const [openFilterMenu, setOpenFilterMenu] = useState<'stores' | 'categories' | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [newCoupon, setNewCoupon] = useState<NewCoupon>(initialCouponState)
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null)
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null)

  useEffect(() => {
    fetchCoupons()
    fetchCategories()
  }, [])

  useEffect(() => {
    if (location.pathname === '/admin' && !isLoggedIn) {
      const password = prompt('Enter admin password:')
      if (password === ADMIN_PASSWORD) {
        setIsLoggedIn(true)
      } else {
        alert('Incorrect password')
        window.location.href = '/'
      }
    }
  }, [location.pathname, isLoggedIn])

  const fetchCoupons = async () => {
    const nowIso = new Date().toISOString()
    const { error: expireError } = await supabase
      .from('coupons')
      .update({ status: 'EXPIRED' })
      .eq('status', 'ACTIVE')
      .lt('end_at', nowIso)

    if (expireError) {
      console.error('Error expiring coupons:', expireError)
    }

    const { data, error } = await supabase
      .from('coupons')
      .select('*, stores(id, name, slug, logo_url), coupon_categories(categories(id, name, slug))')
      .order('end_at', { ascending: true })

    if (error) {
      console.error('Error fetching coupons:', error)
      return
    }

    const sortedCoupons = ((data as Coupon[]) ?? []).sort((a, b) => {
      const aExpired = isCouponExpired(a)
      const bExpired = isCouponExpired(b)

      if (aExpired !== bExpired) {
        return aExpired ? 1 : -1
      }

      return new Date(a.end_at).getTime() - new Date(b.end_at).getTime()
    })

    setCoupons(sortedCoupons)
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return
    }

    setCategories((data as Category[]) ?? [])
  }

  const stores = useMemo<Store[]>(() => {
    const uniqueStores = new Map<string, Store>()

    coupons.forEach((coupon) => {
      const store = coupon.stores
      if (store?.id && !uniqueStores.has(store.id)) {
        uniqueStores.set(store.id, store)
      }
    })

    return [...uniqueStores.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [coupons])

  const visibleCategories = useMemo<Category[]>(() => {
    const uniqueCategories = new Map<string, Category>()

    coupons.forEach((coupon) => {
      ;(coupon.coupon_categories ?? []).forEach((link) => {
        const category = link.categories
        if (category?.id && !uniqueCategories.has(category.id)) {
          uniqueCategories.set(category.id, category)
        }
      })
    })

    return [...uniqueCategories.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [coupons])

  const handleFieldChange = (field: keyof NewCoupon, value: string | boolean | File | null) => {
    setNewCoupon((current) => ({ ...current, [field]: value }))
  }

  const handleCategoryToggle = (categoryId: string) => {
    setNewCoupon((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((id) => id !== categoryId)
        : [...current.categoryIds, categoryId]
    }))
  }

  const resetCouponForm = () => {
    setNewCoupon(initialCouponState)
    setEditingCouponId(null)
  }

  const uploadStoreLogo = async (storeSlug: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Logo upload only supports image files.')
    }

    const extension = getFileExtension(file)
    const filename = `${storeSlug}-${Date.now()}.${extension}`
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || `image/${extension}`
      })

    if (error) {
      throw new Error(`Logo upload failed: ${error.message}`)
    }

    const { data: publicUrlData } = supabase.storage
      .from('logos')
      .getPublicUrl(data.path)

    return publicUrlData.publicUrl
  }

  const createOrGetStoreId = async (storeName: string, logoUrl: string, logoFile: File | null) => {
    const slug = sanitizeStoreSlug(storeName)
    const { data: existingStores, error: fetchError } = await supabase
      .from('stores')
      .select('id, logo_url')
      .eq('slug', slug)
      .limit(1)

    if (fetchError) {
      throw fetchError
    }

    if (existingStores && existingStores.length > 0) {
      const store = existingStores[0]
      if (logoFile) {
        const uploadedUrl = await uploadStoreLogo(slug, logoFile)
        await supabase.from('stores').update({ logo_url: uploadedUrl }).eq('id', store.id)
      } else if (logoUrl && store.logo_url !== logoUrl) {
        await supabase.from('stores').update({ logo_url: logoUrl }).eq('id', store.id)
      }
      return store.id
    }

    let logoPath = logoUrl || null
    if (!logoPath && logoFile) {
      logoPath = await uploadStoreLogo(slug, logoFile)
    }

    const { data: insertedStore, error: insertError } = await supabase
      .from('stores')
      .insert([{ name: storeName, slug, logo_url: logoPath }])
      .select('id')
      .single()

    if (insertError || !insertedStore) {
      throw insertError ?? new Error('Failed to create store')
    }

    return insertedStore.id
  }

  const syncCouponCategories = async (couponId: string, categoryIds: string[]) => {
    const { error: deleteError } = await supabase.from('coupon_categories').delete().eq('coupon_id', couponId)

    if (deleteError) {
      throw deleteError
    }

    if (categoryIds.length === 0) {
      return
    }

    const { error: insertError } = await supabase
      .from('coupon_categories')
      .insert(categoryIds.map((categoryId) => ({ coupon_id: couponId, category_id: categoryId })))

    if (insertError) {
      throw insertError
    }
  }

  const handleSaveCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const storeId = await createOrGetStoreId(newCoupon.storeName, newCoupon.logoUrl, newCoupon.logoFile)
      const payload = {
        store_id: storeId,
        title: newCoupon.title,
        description: newCoupon.description,
        coupon_code: newCoupon.code || null,
        discount_type: newCoupon.discountType,
        discount_value: newCoupon.discountType === 'FREE_SHIPPING' ? null : newCoupon.discountValue || null,
        url: newCoupon.url || null,
        end_at: newCoupon.endAt,
        is_verified: newCoupon.isVerified,
        is_exclusive: newCoupon.isExclusive
      }

      if (editingCouponId) {
        const { error } = await supabase.from('coupons').update(payload).eq('id', editingCouponId)

        if (error) {
          throw error
        }

        await syncCouponCategories(editingCouponId, newCoupon.categoryIds)
      } else {
        const { data, error } = await supabase
          .from('coupons')
          .insert([{ ...payload, status: 'ACTIVE' }])
          .select('id')
          .single()

        if (error || !data) {
          throw error ?? new Error('Unable to create coupon.')
        }

        await syncCouponCategories(data.id as string, newCoupon.categoryIds)
      }

      alert(editingCouponId ? 'Coupon updated successfully' : 'Coupon added successfully')
      resetCouponForm()
      fetchCoupons()
    } catch (error) {
      console.error('Save coupon failed:', error)
      const message = error instanceof Error ? error.message : 'Unable to save coupon.'
      alert(message)
    }
  }

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCouponId(coupon.id)
    setNewCoupon({
      title: coupon.title,
      storeName: coupon.stores?.name ?? '',
      logoUrl: coupon.stores?.logo_url ?? '',
      logoFile: null,
      discountType: coupon.discount_type ?? 'PERCENT',
      discountValue: coupon.discount_value ?? '',
      code: coupon.coupon_code ?? '',
      description: coupon.description ?? '',
      url: coupon.url ?? '',
      endAt: coupon.end_at.slice(0, 10),
      isVerified: coupon.is_verified,
      isExclusive: coupon.is_exclusive,
      categoryIds: coupon.coupon_categories?.flatMap((link) => (link.categories?.id ? [link.categories.id] : [])) ?? []
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteCoupon = async (couponId: string) => {
    const shouldDelete = window.confirm('Delete this coupon? This action cannot be undone.')

    if (!shouldDelete) {
      return
    }

    try {
      setDeletingCouponId(couponId)
      const { error } = await supabase.from('coupons').delete().eq('id', couponId)

      if (error) {
        throw error
      }

      setCoupons((current) => current.filter((coupon) => coupon.id !== couponId))
      if (editingCouponId === couponId) {
        resetCouponForm()
      }
      alert('Coupon deleted successfully')
    } catch (error) {
      console.error('Delete coupon failed:', error)
      const message = error instanceof Error ? error.message : 'Unable to delete coupon.'
      alert(message)
    } finally {
      setDeletingCouponId(null)
    }
  }

  const filteredCoupons = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase()

    const matchingCoupons = coupons.filter((coupon) => {
      const storeMatch = selectedStoreSlug ? coupon.stores?.slug === selectedStoreSlug : true
      const categoryMatch = selectedCategorySlug
        ? (coupon.coupon_categories ?? []).some((link) => link.categories?.slug === selectedCategorySlug)
        : true
      const verifiedMatch = verifiedOnly ? coupon.is_verified : true
      const searchMatch =
        coupon.title.toLowerCase().includes(lowerSearch) ||
        coupon.stores?.name.toLowerCase().includes(lowerSearch) ||
        (coupon.coupon_categories ?? []).some((link) => link.categories?.name.toLowerCase().includes(lowerSearch))

      return storeMatch && categoryMatch && verifiedMatch && searchMatch
    })

    return matchingCoupons.sort((a, b) => {
      const aExpired = isCouponExpired(a)
      const bExpired = isCouponExpired(b)

      if (aExpired !== bExpired) {
        return aExpired ? 1 : -1
      }

      if (sortOption === 'newest') {
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      }

      if (sortOption === 'best-discount') {
        return getCouponDiscountScore(b) - getCouponDiscountScore(a)
      }

      return new Date(a.end_at).getTime() - new Date(b.end_at).getTime()
    })
  }, [coupons, searchTerm, selectedStoreSlug, selectedCategorySlug, verifiedOnly, sortOption])

  if (location.pathname === '/admin') {
    if (!isLoggedIn) {
      return <div>Authenticating...</div>
    }

    return (
      <div className="app">
        <header>
          <h1>Retail Flipp - Admin</h1>
          <Link to="/" className="admin-btn">Back to Main</Link>
        </header>
        <main>
          <AdminPanel
            coupon={newCoupon}
            categories={categories}
            isEditing={editingCouponId !== null}
            onChange={handleFieldChange}
            onCategoryToggle={handleCategoryToggle}
            onCancelEdit={resetCouponForm}
            onFileChange={(file) => handleFieldChange('logoFile', file)}
            onSubmit={handleSaveCoupon}
          />
          <section className="admin-panel admin-coupon-list">
            <div className="admin-list-header">
              <div>
                <h2>Existing Coupons</h2>
                <p>Review current coupons, update their details, or remove outdated offers.</p>
              </div>
              <span className="admin-count">{coupons.length} total</span>
            </div>

            <div className="admin-list-items">
              {coupons.length === 0 ? (
                <p className="admin-empty-state">No coupons found yet.</p>
              ) : (
                coupons.map((coupon) => (
                  <article key={coupon.id} className="admin-coupon-item">
                    <div className="admin-coupon-copy">
                      <p className="admin-coupon-store">{coupon.stores?.name ?? 'Unknown store'}</p>
                      <h3>{coupon.title}</h3>
                      <p className="admin-coupon-meta">
                        Expires {new Date(coupon.end_at).toLocaleDateString()}
                        {coupon.coupon_code ? ` | Code: ${coupon.coupon_code}` : ''}
                      </p>
                    </div>
                    <div className="admin-coupon-actions">
                      <button type="button" className="admin-edit-btn" onClick={() => handleEditCoupon(coupon)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-delete-btn"
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        disabled={deletingCouponId === coupon.id}
                      >
                        {deletingCouponId === coupon.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="hero-header">
        <div className="top-panel">
          <div className="brand-line">
            <span className="brand-mark">Retail</span>
            <span className="brand-name">Flipp</span>
          </div>
          <div className="top-panel-search">
            <SearchBar value={searchTerm} onChange={setSearchTerm} />
          </div>
          <div className="top-panel-links">
            <div className="header-filter-dropdown">
              <button
                type="button"
                className="header-filter-trigger"
                onClick={() => setOpenFilterMenu((current) => (current === 'stores' ? null : 'stores'))}
              >
                Stores
              </button>
              {openFilterMenu === 'stores' && (
                <div className="header-filter-menu">
                  <button
                    type="button"
                    className="header-filter-option"
                    onClick={() => {
                      setSelectedStoreSlug(null)
                      setOpenFilterMenu(null)
                    }}
                  >
                    All Stores
                  </button>
                  {stores.map((store) => (
                    <button
                      key={store.id}
                      type="button"
                      className="header-filter-option"
                      onClick={() => {
                        setSelectedStoreSlug(store.slug ?? null)
                        setOpenFilterMenu(null)
                      }}
                    >
                      {store.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="header-filter-dropdown">
              <button
                type="button"
                className="header-filter-trigger"
                onClick={() => setOpenFilterMenu((current) => (current === 'categories' ? null : 'categories'))}
              >
                Categories
              </button>
              {openFilterMenu === 'categories' && (
                <div className="header-filter-menu">
                  <button
                    type="button"
                    className="header-filter-option"
                    onClick={() => {
                      setSelectedCategorySlug(null)
                      setOpenFilterMenu(null)
                    }}
                  >
                    All Categories
                  </button>
                  {visibleCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className="header-filter-option"
                      onClick={() => {
                        setSelectedCategorySlug(category.slug)
                        setOpenFilterMenu(null)
                      }}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hero-content">
          <div>
            <p className="eyebrow">Trusted Canadian coupon hub</p>
            <p className="hero-copy">Search the latest coupons and deals across stores, categories, and exclusive offers.</p>
          </div>
        </div>
      </header>

      <main>
        <section className="browse-controls">
          <div className="browse-sort">
            <span className="browse-label">Sort</span>
            <button
              type="button"
              className={`browse-chip ${sortOption === 'newest' ? 'active' : ''}`}
              onClick={() => setSortOption('newest')}
            >
              Newest
            </button>
            <button
              type="button"
              className={`browse-chip ${sortOption === 'expiring' ? 'active' : ''}`}
              onClick={() => setSortOption('expiring')}
            >
              Expiring Soon
            </button>
            <button
              type="button"
              className={`browse-chip ${sortOption === 'best-discount' ? 'active' : ''}`}
              onClick={() => setSortOption('best-discount')}
            >
              Best Discount
            </button>
          </div>
          <button
            type="button"
            className={`browse-chip browse-toggle ${verifiedOnly ? 'active' : ''}`}
            onClick={() => setVerifiedOnly((current) => !current)}
          >
            Verified Only
          </button>
        </section>

        <section className="active-filters">
          {selectedStoreSlug && (
            <button type="button" className="active-filter-chip" onClick={() => setSelectedStoreSlug(null)}>
              Store: {stores.find((store) => store.slug === selectedStoreSlug)?.name} x
            </button>
          )}
          {selectedCategorySlug && (
            <button type="button" className="active-filter-chip" onClick={() => setSelectedCategorySlug(null)}>
              Category: {visibleCategories.find((category) => category.slug === selectedCategorySlug)?.name ?? categories.find((category) => category.slug === selectedCategorySlug)?.name} x
            </button>
          )}
          {verifiedOnly && (
            <button type="button" className="active-filter-chip" onClick={() => setVerifiedOnly(false)}>
              Verified Only x
            </button>
          )}
        </section>

        <section className="coupons-grid" id="deals">
          {filteredCoupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </section>

        <section className="faq-section" aria-labelledby="faq-heading">
          <div className="faq-shell">
            <h2 id="faq-heading">Frequently Asked Questions</h2>
            <div className="faq-list">
              {faqItems.map((item, index) => (
                <details key={item.question} className="faq-item" open={index === 0}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
            <p className="faq-note">
              Retail Flipp helps shoppers discover coupon codes, featured offers, and everyday savings across popular brands and retailers.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <h3>Retail Flipp</h3>
            <p>Canada&apos;s best coupon finder for verified codes, deals, and savings.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <a href="#stores">Browse Stores</a>
            <a href="#categories">Browse Categories</a>
            <a href="#deals">Top Deals</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#about">About</a>
            <a href="#">Careers</a>
            <a href="#">Blog</a>
          </div>
          <div>
            <h4>Support</h4>
            <a href="#">Submit a Coupon</a>
            <a href="#">Get Help</a>
            <a href="#">Terms</a>
          </div>
        </div>
        <div className="footer-bar">
          <p>Copyright 2026 Retail Flipp. All rights reserved.</p>
          <div className="social-links">
            <a href="#">Facebook</a>
            <a href="#">Instagram</a>
            <a href="#">Pinterest</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
