'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Plus, Package, Clock, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

interface DistributorOrder {
  id: string
  order_code: string
  product_name: string
  quantity: number
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled'
  requested_at: string
  notes: string
}

interface Distributor {
  id: string
  name: string
  email: string
}

export default function DistributorOrdersPage({ params }: { params: { id: string } }) {
  const [distributor, setDistributor] = useState<Distributor | null>(null)
  const [orders, setOrders] = useState<DistributorOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchDistributorData()
    fetchDistributorOrders()
  }, [params.id])

  const fetchDistributorData = async () => {
    try {
      const { data, error } = await supabase
        .from('distributors')
        .select('id, name, email')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setDistributor(data)
    } catch (error) {
      console.error('Error fetching distributor:', error)
    }
  }

  const fetchDistributorOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('distributor_orders')
        .select('*')
        .eq('distributor_id', params.id)
        .order('requested_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching distributor orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderAction = async (orderId: string, action: 'approve' | 'reject') => {
    setActionLoading(orderId)
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected'
      
      const { error } = await supabase
        .from('distributor_orders')
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      // If approved, create a purchase order
      if (action === 'approve') {
        const order = orders.find(o => o.id === orderId)
        if (order) {
          // Create purchase order logic here
          console.log('Creating purchase order for:', order)
        }
      }

      fetchDistributorOrders()
    } catch (error) {
      console.error(`Error ${action}ing order:`, error)
      alert(`Failed to ${action} order`)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />
      case 'fulfilled': return <Package className="w-4 h-4 text-blue-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'fulfilled': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-6">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/distributors" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Distributors
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {distributor?.name || 'Distributor'} Orders
            </h1>
            <p className="text-gray-600 mt-1">Review and manage distributor order requests</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Contact</p>
            <p className="text-sm font-medium">{distributor?.email}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'approved').length}</div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{orders.filter(o => o.status === 'rejected').length}</div>
          <div className="text-sm text-gray-600">Rejected</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'fulfilled').length}</div>
          <div className="text-sm text-gray-600">Fulfilled</div>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  {getStatusIcon(order.status)}
                  <h3 className="text-lg font-semibold ml-2">{order.order_code}</h3>
                  <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product</label>
                    <p className="text-gray-900">{order.product_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <p className="text-gray-900">{order.quantity.toLocaleString()} units</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Requested</label>
                    <p className="text-gray-900">{new Date(order.requested_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {order.notes && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded">{order.notes}</p>
                  </div>
                )}
              </div>

              {order.status === 'pending' && (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleOrderAction(order.id, 'approve')}
                    disabled={actionLoading === order.id}
                    className="btn-primary text-sm"
                  >
                    {actionLoading === order.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleOrderAction(order.id, 'reject')}
                    disabled={actionLoading === order.id}
                    className="btn-secondary text-sm"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600">This distributor hasn't submitted any orders yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
