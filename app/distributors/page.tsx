'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Building, Phone, Mail, MapPin, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface Distributor {
  id: string
  name: string
  email: string
  phone: string
  address: string
  status: string
  created_at: string
}

export default function DistributorsPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchDistributors()
  }, [])

  const fetchDistributors = async () => {
    try {
      const { data, error } = await supabase
        .from('distributors')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDistributors(data || [])
    } catch (error) {
      console.error('Error fetching distributors:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDistributors = distributors.filter(distributor =>
    distributor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    distributor.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Distributors</h1>
            <p className="text-gray-600 mt-1">Manage distributor relationships and workflows</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Distributor
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search distributors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredDistributors.map(distributor => (
              <div key={distributor.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{distributor.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(distributor.status)}`}>
                      {distributor.status.toUpperCase()}
                    </span>
                  </div>
                  <Building className="w-5 h-5 text-gray-400" />
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {distributor.email}
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {distributor.phone}
                  </div>
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                    <span className="leading-tight">{distributor.address}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Added {new Date(distributor.created_at).toLocaleDateString()}
                    </span>
                    <Link 
                      href={`/distributors/${distributor.id}/orders`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Orders →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDistributors.length === 0 && !loading && (
            <div className="text-center py-12">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No distributors found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by adding your first distributor.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  Add Distributor
                </button>
              )}
            </div>
          )}
        </>
      )}

      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Distributor Workflow Overview</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            <h3 className="font-medium mb-2">Order Submission</h3>
            <p className="text-sm text-gray-600">Distributors submit orders through their portal</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-yellow-600 font-bold">2</span>
            </div>
            <h3 className="font-medium mb-2">HQ Review</h3>
            <p className="text-sm text-gray-600">HQ reviews and approves distributor orders</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-green-600 font-bold">3</span>
            </div>
            <h3 className="font-medium mb-2">QR Generation</h3>
            <p className="text-sm text-gray-600">Approved orders generate QR code batches</p>
          </div>
        </div>
      </div>
    </div>
  )
}
