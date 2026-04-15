import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

const ADMIN_PASSWORD = 'admin123' // Change this to your desired password

function App() {
  const [coupons, setCoupons] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [newCoupon, setNewCoupon] = useState({
    title: '',
    store: '',
    discount: '',
    code: '',
    description: '',
    expiry: ''
  })

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
    if (error) console.error('Error fetching coupons:', error)
    else setCoupons(data || [])
  }

  const handleAdminLogin = () => {
    const password = prompt('Enter admin password:')
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true)
    } else {
      alert('Incorrect password')
    }
  }

  const handleAddCoupon = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('coupons')
      .insert([newCoupon])
    if (error) {
      console.error('Error adding coupon:', error)
      alert('Error adding coupon')
    } else {
      alert('Coupon added successfully')
      setNewCoupon({
        title: '',
        store: '',
        discount: '',
        code: '',
        description: '',
        expiry: ''
      })
      fetchCoupons() // Refresh the list
    }
  }

  const filteredCoupons = coupons.filter(coupon =>
    coupon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.store.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="app">
      <header>
        <h1>Retail Flipp</h1>
        <p>Find the best coupons and deals</p>
        <input
          type="text"
          placeholder="Search coupons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
        />
        {!isAdmin && (
          <button onClick={handleAdminLogin} className="admin-btn">Admin Login</button>
        )}
      </header>
      <main>
        {isAdmin && (
          <div className="admin-panel">
            <h2>Add New Coupon</h2>
            <form onSubmit={handleAddCoupon} className="coupon-form">
              <input
                type="text"
                placeholder="Title"
                value={newCoupon.title}
                onChange={(e) => setNewCoupon({ ...newCoupon, title: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Store"
                value={newCoupon.store}
                onChange={(e) => setNewCoupon({ ...newCoupon, store: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Discount"
                value={newCoupon.discount}
                onChange={(e) => setNewCoupon({ ...newCoupon, discount: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Code"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                required
              />
              <textarea
                placeholder="Description"
                value={newCoupon.description}
                onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                required
              />
              <input
                type="date"
                value={newCoupon.expiry}
                onChange={(e) => setNewCoupon({ ...newCoupon, expiry: e.target.value })}
                required
              />
              <button type="submit">Add Coupon</button>
            </form>
          </div>
        )}
        <div className="coupons-grid">
          {filteredCoupons.map(coupon => (
            <div key={coupon.id} className="coupon-card">
              <h2>{coupon.title}</h2>
              <p><strong>Store:</strong> {coupon.store}</p>
              <p><strong>Discount:</strong> {coupon.discount}</p>
              <p><strong>Code:</strong> {coupon.code}</p>
              <p>{coupon.description}</p>
              <p><strong>Expires:</strong> {coupon.expiry}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App