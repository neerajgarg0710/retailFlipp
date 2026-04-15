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
  discountType: 'PERCENT',
  discountValue: '',
  code: '',
  description: '',
  url: '',
  endAt: ''
}

function App() {
  const location = useLocation()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [newCoupon, setNewCoupon] = useState<NewCoupon>(initialCouponState)

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
        window.location.href = '/' // Redirect to main
      }
    }
  }, [location.pathname, isLoggedIn])

  const fetchCoupons = async () => {
    const { data, error } = await supabase
      .from<Coupon>('coupons')
      .select('*, stores(name)')
      .order('end_at', { ascending: true })

    if (error) {
      console.error('Error fetching coupons:', error)
      return
    }

    setCoupons(data ?? [])
  }

  const handleFieldChange = (field: keyof NewCoupon, value: string) => {
    setNewCoupon((current) => ({ ...current, [field]: value }))
  }

  const createOrGetStoreId = async (storeName: string) => {
    const slug = storeName.trim().toLowerCase().replace(/\s+/g, '-')
    const { data: existingStores, error: fetchError } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .limit(1)

    if (fetchError) {
      throw fetchError
    }

    if (existingStores && existingStores.length > 0) {
      return existingStores[0].id
    }

    const { data: insertedStore, error: insertError } = await supabase
      .from('stores')
      .insert([{ name: storeName, slug }])
      .select('id')
      .single()

    if (insertError || !insertedStore) {
      throw insertError ?? new Error('Failed to create store')
    }

    return insertedStore.id
  }

  const handleAddCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const storeId = await createOrGetStoreId(newCoupon.storeName)
      const { error } = await supabase.from('coupons').insert([
        {
          store_id: storeId,
          title: newCoupon.title,
          description: newCoupon.description,
          coupon_code: newCoupon.code || null,
          discount_type: newCoupon.discountType,
          discount_value: newCoupon.discountType === 'FREE_SHIPPING' ? null : newCoupon.discountValue || null,
          url: newCoupon.url || null,
          end_at: newCoupon.endAt,
          is_verified: false,
          is_exclusive: false,
          status: 'ACTIVE'
        }
      ])

      if (error) {
        console.error('Error adding coupon:', error)
        alert('Error adding coupon')
        return
      }

      alert('Coupon added successfully')
      setNewCoupon(initialCouponState)
      fetchCoupons()
    } catch (error) {
      console.error('Add coupon failed:', error)
      alert('Unable to add coupon. Check console for details.')
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
      return <div>Authenticating...</div> // Temporary while prompt shows
    }
    return (
      <div className="app">
        <header>
          <h1>Retail Flipp - Admin</h1>
          <Link to="/" className="admin-btn">Back to Main</Link>
        </header>
        <main>
          <AdminPanel coupon={newCoupon} onChange={handleFieldChange} onSubmit={handleAddCoupon} />
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>Retail Flipp</h1>
        <p>Find the best coupons and deals</p>
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
      </header>
      <main>
        <div className="coupons-grid">
          {filteredCoupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
