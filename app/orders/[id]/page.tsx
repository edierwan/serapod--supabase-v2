'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, FileText, Send, Package, Clock } from 'lucide-react'
import Link from 'next/link'

interface OrderDetails {
  id: string
  code: string
  total_units: number
  status: string
  po_sent_at: string | null
  created_at: string
  manufacturers: {
    name: string
    email: string
  }
  products: {
    name: string
    price_cents: number
  }
}

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchOrderDetails()
  }, [params.id])

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          manufacturers(name, email),
          products(name, price_cents)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRenderPO = async () => {
    setActionLoading('render')
    try {
      // Call the orders function with render endpoint
      const response = await fetch('/api/orders/po/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: params.id }),
      })

      const result = await response.json()
      if (result.ok) {
        alert('PO rendered successfully!')
        // Optionally open the PDF URL
        if (result.data.publicUrl) {
          window.open(result.data.publicUrl, '_blank')
        }
      } else {
        throw new Error(result.error?.message || 'Failed to render PO')
      }
    } catch (error) {
      console.error('Error rendering PO:', error)
      alert('Failed to render PO')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendPO = async () => {
    setActionLoading('send')
    try {
      const response = await fetch('/api/orders/po/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: params.id }),
      })

      const result = await response.json()
      if (result.ok) {
        alert('PO sent successfully!')
        fetchOrderDetails() // Refresh to update status
      } else {
        throw new Error(result.error?.message || 'Failed to send PO')
      }
    } catch (error) {
      console.error('Error sending PO:', error)
      alert('Failed to send PO')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateBatch = async () => {
    setActionLoading('batch')
    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: params.id,
          product_id: order?.products?.id,
          total_units: order?.total_units,
        }),
      })

      const result = await response.json()
      if (result.ok) {
        alert('Batch created successfully!')
        // Redirect to batch details or refresh
      } else {
        throw new Error(result.error?.message || 'Failed to create batch')
      }
    } catch (error) {
      console.error('Error creating batch:', error)
      alert('Failed to create batch')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="card p-6">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <Link href="/" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created': return 'bg-blue-100 text-blue-800'
      case 'po_sent': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{order.code}</h1>
            <p className="text-gray-600 mt-1">Purchase Order Details</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
            {order.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Order Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Order Code</label>
                <p className="mt-1 text-gray-900">{order.code}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Units</label>
                <p className="mt-1 text-gray-900">{order.total_units.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created Date</label>
                <p className="mt-1 text-gray-900">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              {order.po_sent_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">PO Sent Date</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(order.po_sent_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Manufacturer Details</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <p className="mt-1 text-gray-900">{order.manufacturers.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{order.manufacturers.email}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Product Details</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                <p className="mt-1 text-gray-900">{order.products.name}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                  <p className="mt-1 text-gray-900">${(order.products.price_cents / 100).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Value</label>
                  <p className="mt-1 text-gray-900 font-semibold">
                    ${((order.products.price_cents * order.total_units) / 100).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handleRenderPO}
                disabled={actionLoading === 'render'}
                className="w-full btn-primary flex items-center justify-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                {actionLoading === 'render' ? 'Rendering...' : 'Render PO'}
              </button>

              <button
                onClick={handleSendPO}
                disabled={actionLoading === 'send' || order.status === 'po_sent'}
                className="w-full btn-primary flex items-center justify-center"
              >
                <Send className="w-4 h-4 mr-2" />
                {actionLoading === 'send' ? 'Sending...' : 'Send PO'}
              </button>

              <button
                onClick={handleCreateBatch}
                disabled={actionLoading === 'batch'}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <Package className="w-4 h-4 mr-2" />
                {actionLoading === 'batch' ? 'Creating...' : 'Create QR Batch'}
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-3">Timeline</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <div className="text-sm">
                  <p className="font-medium">Order Created</p>
                  <p className="text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
                </div>
              </div>
              {order.po_sent_at && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div className="text-sm">
                    <p className="font-medium">PO Sent</p>
                    <p className="text-gray-600">{new Date(order.po_sent_at).toLocaleString()}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
                <div className="text-sm">
                  <p className="font-medium text-gray-500">Batch Creation</p>
                  <p className="text-gray-500">Pending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
