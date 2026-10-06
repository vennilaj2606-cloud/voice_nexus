'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { api } from '@/services/api';
import { 
  Building2, 
  Plus, 
  Search, 
  Bed, 
  Bath, 
  DollarSign, 
  MapPin, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Sparkles,
  RefreshCw,
  Eye
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  status: string;
  description: string;
  created_at: string;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    price: 500000,
    bedrooms: 3,
    bathrooms: 2,
    status: 'available',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch properties from PostgreSQL
  const fetchProperties = async () => {
    setLoading(true);
    try {
      const response = await api.get('/properties/');
      setProperties(response.data);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenAddModal = () => {
    setEditingProperty(null);
    setFormData({
      title: '',
      address: '',
      price: 650000,
      bedrooms: 3,
      bathrooms: 2.5,
      status: 'available',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      title: property.title,
      address: property.address,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      status: property.status,
      description: property.description
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingProperty) {
        // Update existing property in PostgreSQL
        await api.put(`/properties/${editingProperty.id}`, formData);
        showNotification('Property updated successfully in PostgreSQL!');
      } else {
        // Create new property in PostgreSQL
        await api.post('/properties/', formData);
        showNotification('New property added to PostgreSQL database!');
      }
      setIsModalOpen(false);
      fetchProperties();
    } catch (err) {
      console.error('Failed to save property:', err);
      showNotification('Error saving property to database.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property listing?')) return;

    try {
      await api.delete(`/properties/${id}`);
      showNotification('Property deleted from PostgreSQL!');
      fetchProperties();
    } catch (err) {
      console.error('Failed to delete property:', err);
      showNotification('Error deleting property.');
    }
  };

  const filteredProperties = properties.filter((p) => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />

        <main className="p-8 space-y-8 flex-1">
          {/* Notification Toast */}
          {notification && (
            <div className="fixed top-20 right-8 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-indigo-400/30 animate-bounce">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">{notification}</span>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-3">
                <Building2 className="w-8 h-8 text-indigo-400" />
                <span>Properties Table & Inventory</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage real estate listings stored directly in your live PostgreSQL database for AI voice calls.
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchProperties}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Refresh Table"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleOpenAddModal}
                className="gradient-bg px-5 py-2.5 rounded-xl font-medium text-sm text-white shadow-lg shadow-indigo-500/25 flex items-center space-x-2 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>Add Property</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search by title, location, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
              {['all', 'available', 'pending', 'sold'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                    filterStatus === status
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Properties Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-4">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-semibold text-slate-300">No Property Listings Found</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                No properties match your filter criteria or the PostgreSQL database has no records. Add a new listing to start querying via Voice AI!
              </p>
              <button
                onClick={handleOpenAddModal}
                className="gradient-bg px-5 py-2.5 rounded-xl font-medium text-sm text-white shadow-lg shadow-indigo-500/25 inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Property</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {property.status}
                      </span>
                      <span className="text-xl font-bold text-emerald-400 flex items-center">
                        <DollarSign className="w-4 h-4" />
                        {property.price.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {property.title}
                      </h3>
                      <p className="text-slate-400 text-xs flex items-center space-x-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{property.address}</span>
                      </p>
                    </div>

                    <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed">
                      {property.description}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-slate-800/60 mt-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-slate-300 text-xs">
                      <span className="flex items-center space-x-1">
                        <Bed className="w-4 h-4 text-slate-400" />
                        <span>{property.bedrooms} Beds</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Bath className="w-4 h-4 text-slate-400" />
                        <span>{property.bathrooms} Baths</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(property)}
                        className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:text-indigo-400 hover:bg-slate-800 transition-colors border border-slate-800"
                        title="Edit Property"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(property.id)}
                        className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:text-red-400 hover:bg-slate-800 transition-colors border border-slate-800"
                        title="Delete Property"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-800 p-6 space-y-6 shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <Building2 className="w-6 h-6 text-indigo-400" />
                    <span>{editingProperty ? 'Edit Property Listing' : 'Add New Property Listing'}</span>
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Property Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunset Modern Villa"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Full Address / Location *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 742 Evergreen Terrace, Beverly Hills, CA"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Price ($) *
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        step={1000}
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Bedrooms
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Bathrooms
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Listing Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="available">Available</option>
                      <option value="pending">Pending Viewing / Offer</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Property Description *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe key features, amenities, view, and highlights for Voice AI answers..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="gradient-bg px-6 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg shadow-indigo-500/25 flex items-center space-x-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>{editingProperty ? 'Save Changes' : 'Create Property'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
