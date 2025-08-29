'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Package, Building, Hash } from 'lucide-react'
import Link from 'next/link'

interface Manufacturer {
  id: string
  name: string
  email: string
}

interface Product {
  id: string
  name: string
  price_cents: number
}

export default function CreateOrderPage() {
  const router = useRouter()
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    manufacturer_id: '',
    product_id: '',
    total_units: '',
    code: ''
  })

  useEffect(() => {
    fetchManufacturers()
    fetchProducts()
    generateOrderCode()
  }, [])

  const generateOrderCode = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setFormData(prev => ({ ...prev, code: `PO-${timestamp}-${random}` }))
  }

  const fetchManufacturers = async () => {
    try {
      const { data, error } = await supabase
        .from('manufacturers')
        .select('id, name, email')
        .order('name')

      if (error) throw error
      setManufacturers(data || [])
    } catch (error) {
      console.error('Error fetching manufacturers:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price_cents')
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const orderData = {
        code: formData.code,
        manufacturer_id: formData.manufacturer_id,
        product_id: formData.product_id,
        total_units: parseInt(formData.total_units),
        status: 'created'
      }

      const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single()

      if (error) throw error

      router.push(`/orders/${data.id}`)
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Failed to create order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const selectedProduct = products.find(p => p.id === formData.product_id)
  const estimatedTotal = selectedProduct && formData.total_units
    ? (selectedProduct.price_cents * parseInt(formData.total_units)) / 100
    : 0

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create Purchase Order</h1>
        <p className="text-gray-600 mt-2">Create a new purchase order for a manufacturer</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Hash className="w-4 h-4 inline mr-1" />
            Order Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              className="input-field flex-1"
              required
            />
            <button
              type="button"
              onClick={generateOrderCode}
              className="btn-secondary"
            >
              Regenerate
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building className="w-4 h-4 inline mr-1" />
            Manufacturer
          </label>
          <select
            name="manufacturer_id"
            value={formData.manufacturer_id}
            onChange={handleInputChange}
            className="input-field"
            required
          >
            <option value="">Select a manufacturer</option>
            {manufacturers.map(manufacturer => (
              <option key={manufacturer.id} value={manufacturer.id}>
                {manufacturer.name} ({manufacturer.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Package className="w-4 h-4 inline mr-1" />
            Product
          </label>
          <select
            name="product_id"
            value={formData.product_id}
            onChange={handleInputChange}
            className="input-field"
            required
          >
            <option value="">Select a product</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} (${(product.price_cents / 100).toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Units
          </label>
          <input
            type="number"
            name="total_units"
            value={formData.total_units}
            onChange={handleInputChange}
            min="1"
            className="input-field"
            required
          />
        </div>

        {estimatedTotal > 0 && (
          <div className="bg-primary-50 p-4 rounded-lg">
            <h3 className="font-medium text-primary-900 mb-2">Order Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Units:</span>
                <span>{formData.total_units}</span>
              </div>
              <div className="flex justify-between">
                <span>Unit Price:</span>
                <span>${selectedProduct ? (selectedProduct.price_cents / 100).toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Estimated Total:</span>
                <span>${estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Creating Order...' : 'Create Order'}
          </button>
          <Link href="/" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
