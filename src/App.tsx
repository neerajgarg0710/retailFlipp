import { FormEvent, useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import './App.css'
import { supabase } from './shared/supabaseClient'
import { ADMIN_PASSWORD } from './shared/constants'
import type { Coupon, NewCoupon } from './types'
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
  isExclusive: false
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

  if (file.type === 'image/png') {
    return 'png'
  }

  if (file.type === 'image/jpeg') {
    return 'jpg'
  }

  if (file.type === 'image/webp') {
    return 'webp'
  }

  return 'png'
}

function App() {
  const location = useLocation()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [newCoupon, setNewCoupon] = useState<NewCoupon>(initialCouponState)
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null)
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null)

  useEffect(() => {
    fetchCoupons()
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
    const { data, error } = await supabase
      .from<Coupon>('coupons')
      .select('*, stores(name, logo_url)')
      .order('end_at', { ascending: true })

    if (error) {
      console.error('Error fetching coupons:', error)
      return
    }

    setCoupons(data ?? [])
  }

  const handleFieldChange = (field: keyof NewCoupon, value: string | boolean | File | null) => {
    setNewCoupon((current) => ({ ...current, [field]: value }))
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

      const { error } = editingCouponId
        ? await supabase.from('coupons').update(payload).eq('id', editingCouponId)
        : await supabase.from('coupons').insert([
            {
              ...payload,
              status: 'ACTIVE'
            }
          ])

      if (error) {
        console.error('Error saving coupon:', error)
        alert('Error saving coupon')
        return
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
      isExclusive: coupon.is_exclusive
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

  const filteredCoupons = coupons.filter((coupon) => {
    const lowerSearch = searchTerm.toLowerCase()
    return (
      coupon.title.toLowerCase().includes(lowerSearch) ||
      coupon.stores?.name.toLowerCase().includes(lowerSearch)
    )
  })

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
            isEditing={editingCouponId !== null}
            onChange={handleFieldChange}
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
                      <button
                        type="button"
                        className="admin-edit-btn"
                        onClick={() => handleEditCoupon(coupon)}
                      >
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
            <a href="#stores">Stores</a>
            <a href="#categories">Categories</a>
            <a href="#deals">Deals</a>
          </div>
        </div>

        <div className="hero-content">
          <div>
            <p className="hero-copy">Search the latest coupons and deals across stores, categories, and exclusive offers.</p>
          </div>
        </div>
      </header>

      <main>
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
