import { useState } from 'react'
import './App.css'

const mockCoupons = [
  { id: 1, title: '20% Off Electronics', store: 'Best Buy', discount: '20%', code: 'BEST20', description: 'Save on all electronics', expiry: '2024-12-31' },
  { id: 2, title: 'Free Shipping', store: 'Amazon', discount: 'Free Shipping', code: 'SHIPFREE', description: 'Free shipping on orders over $25', expiry: '2024-11-30' },
  { id: 3, title: '15% Off Clothing', store: 'H&M', discount: '15%', code: 'HM15', description: 'Discount on all clothing items', expiry: '2024-10-31' },
  { id: 4, title: 'Buy One Get One', store: 'Starbucks', discount: 'BOGO', code: 'STARBOGO', description: 'Buy one coffee get one free', expiry: '2024-09-30' },
  { id: 5, title: '30% Off Home Goods', store: 'IKEA', discount: '30%', code: 'IKEA30', description: 'Save on furniture and decor', expiry: '2024-12-15' },
  // Add more as needed
]

function App() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCoupons = mockCoupons.filter(coupon =>
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
      </header>
      <main>
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