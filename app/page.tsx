import Link from 'next/link'
import { Package, ShoppingCart, Users, BarChart3 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Serapod QR Management
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Professional QR code generation and batch management system for supply chain operations
        </p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Link href="/orders/create" className="card p-6 hover:shadow-lg transition-shadow">
          <ShoppingCart className="w-12 h-12 text-primary-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Create Order</h3>
          <p className="text-gray-600">Create new purchase orders for manufacturers</p>
        </Link>

        <Link href="/orders" className="card p-6 hover:shadow-lg transition-shadow">
          <BarChart3 className="w-12 h-12 text-primary-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">View Orders</h3>
          <p className="text-gray-600">Manage and track all purchase orders</p>
        </Link>

        <Link href="/batches" className="card p-6 hover:shadow-lg transition-shadow">
          <Package className="w-12 h-12 text-primary-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">QR Batches</h3>
          <p className="text-gray-600">Generate and manage QR code batches</p>
        </Link>

        <Link href="/distributors" className="card p-6 hover:shadow-lg transition-shadow">
          <Users className="w-12 h-12 text-primary-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Distributors</h3>
          <p className="text-gray-600">Manage distributor workflows</p>
        </Link>
      </div>

      <div className="card p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold text-primary-600">1,247</div>
            <div className="text-gray-600">Total Orders</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">89,340</div>
            <div className="text-gray-600">QR Codes Generated</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">156</div>
            <div className="text-gray-600">Active Batches</div>
          </div>
        </div>
      </div>
    </div>
  )
}
