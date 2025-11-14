'use client'
// pages/deliveryboy/index.js
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, X, Download, Phone, Mail, MapPin, User, Bike } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUser } from '@/lib/auth';

export default function DeliveryBoyManagement() {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [filteredDeliveryBoys, setFilteredDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicle_type: '',
    license_number: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    totalDeliveryBoys: 0,
    activeDeliveryBoys: 0,
    totalDeliveries: 0
  });

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    const user = await getUser();
    if (user) {
      setCurrentUser(user);
      fetchDeliveryBoys(user.id);
    }
  };

  useEffect(() => {
    filterDeliveryBoys();
  }, [searchTerm, deliveryBoys]);

  const fetchDeliveryBoys = async (userId) => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_boys')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;

      // Calculate statistics
      const processedData = data || [];

      setDeliveryBoys(processedData);

      setStats({
        totalDeliveryBoys: processedData.length,
        activeDeliveryBoys: processedData.filter(d => d.status === 'active').length,
        totalDeliveries: 0 // This can be calculated from orders if needed
      });
    } catch (error) {
      console.error('Error fetching delivery boys:', error);
      alert('Error fetching delivery boys: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterDeliveryBoys = () => {
    if (!searchTerm.trim()) {
      setFilteredDeliveryBoys(deliveryBoys);
      return;
    }

    const filtered = deliveryBoys.filter(deliveryBoy =>
      deliveryBoy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deliveryBoy.phone && deliveryBoy.phone.includes(searchTerm)) ||
      (deliveryBoy.email && deliveryBoy.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (deliveryBoy.vehicle_type && deliveryBoy.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredDeliveryBoys(filtered);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      vehicle_type: '',
      license_number: ''
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert('User not authenticated');
      return;
    }

    try {
      const { error } = await supabase
        .from('delivery_boys')
        .insert([{ ...formData, status: 'active', user_id: currentUser.id }]);

      if (error) throw error;

      setShowAddModal(false);
      resetForm();
      fetchDeliveryBoys(currentUser.id);
    } catch (error) {
      console.error('Error adding delivery boy:', error);
      alert('Error adding delivery boy: ' + error.message);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert('User not authenticated');
      return;
    }

    try {
      const { error } = await supabase
        .from('delivery_boys')
        .update(formData)
        .eq('id', selectedDeliveryBoy.id)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedDeliveryBoy(null);
      resetForm();
      fetchDeliveryBoys(currentUser.id);
    } catch (error) {
      console.error('Error updating delivery boy:', error);
      alert('Error updating delivery boy: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this delivery boy? This action cannot be undone.')) return;

    if (!currentUser) {
      alert('User not authenticated');
      return;
    }

    try {
      const { error } = await supabase
        .from('delivery_boys')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      fetchDeliveryBoys(currentUser.id);
    } catch (error) {
      console.error('Error deleting delivery boy:', error);
      alert('Error deleting delivery boy: ' + error.message);
    }
  };

  const openEditModal = (deliveryBoy) => {
    setSelectedDeliveryBoy(deliveryBoy);
    setFormData({
      name: deliveryBoy.name || '',
      phone: deliveryBoy.phone || '',
      email: deliveryBoy.email || '',
      address: deliveryBoy.address || '',
      vehicle_type: deliveryBoy.vehicle_type || '',
      license_number: deliveryBoy.license_number || ''
    });
    setShowEditModal(true);
  };

  const openViewModal = async (deliveryBoy) => {
    setSelectedDeliveryBoy(deliveryBoy);
    setShowViewModal(true);
  };

  const exportToCSV = () => {
    if (filteredDeliveryBoys.length === 0) {
      alert('No delivery boys to export');
      return;
    }

    // CSV Headers
    const headers = ['Name', 'Phone', 'Email', 'Address', 'Vehicle Type', 'License Number', 'Status'];

    // CSV Rows
    const rows = filteredDeliveryBoys.map(deliveryBoy => [
      deliveryBoy.name || '',
      deliveryBoy.phone || '',
      deliveryBoy.email || '',
      deliveryBoy.address || '',
      deliveryBoy.vehicle_type || '',
      deliveryBoy.license_number || '',
      deliveryBoy.status || 'active'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `delivery_boys_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && deliveryBoys.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading delivery boys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Boy Management</h1>
          <p className="text-gray-600">Manage your delivery boys and track delivery history</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Delivery Boys</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDeliveryBoys}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Delivery Boys</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeDeliveryBoys}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Bike className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Deliveries</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalDeliveries}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Download className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search delivery boys by name, phone, email, or vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              {/* Export Button */}
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>

              {/* Add Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Delivery Boy
              </button>
            </div>
          </div>
        </div>

        {/* Delivery Boys Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Boy Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDeliveryBoys.map(deliveryBoy => (
                  <tr key={deliveryBoy.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{deliveryBoy.name}</div>
                        {deliveryBoy.license_number && (
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            License: {deliveryBoy.license_number}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {deliveryBoy.phone && (
                          <div className="text-sm text-gray-900 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {deliveryBoy.phone}
                          </div>
                        )}
                        {deliveryBoy.email && (
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {deliveryBoy.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {deliveryBoy.address ? (
                        <div className="text-sm text-gray-600 flex items-start gap-2 max-w-xs">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{deliveryBoy.address}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {deliveryBoy.vehicle_type ? (
                        <div className="flex items-center gap-2">
                          <Bike className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{deliveryBoy.vehicle_type}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        deliveryBoy.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {deliveryBoy.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openViewModal(deliveryBoy)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(deliveryBoy)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Edit Delivery Boy"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(deliveryBoy.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete Delivery Boy"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDeliveryBoys.length === 0 && (
            <div className="text-center py-12">
              <Bike className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No delivery boys found</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first delivery boy
              </button>
            </div>
          )}
        </div>

        {/* Add Delivery Boy Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
            <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add New Delivery Boy</h2>
                <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., +92-300-1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., deliveryboy@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Full address..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Type
                    </label>
                    <input
                      type="text"
                      name="vehicle_type"
                      value={formData.vehicle_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Motorcycle, Bicycle, Car"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      name="license_number"
                      value={formData.license_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., DL-1234567890"
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6 mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); resetForm(); }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Delivery Boy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Delivery Boy Modal */}
        {showEditModal && selectedDeliveryBoy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
            <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit Delivery Boy</h2>
                <button onClick={() => { setShowEditModal(false); setSelectedDeliveryBoy(null); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleEdit} className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., +92-300-1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., deliveryboy@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Full address..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Type
                    </label>
                    <input
                      type="text"
                      name="vehicle_type"
                      value={formData.vehicle_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Motorcycle, Bicycle, Car"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      name="license_number"
                      value={formData.license_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., DL-1234567890"
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6 mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setSelectedDeliveryBoy(null); resetForm(); }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Delivery Boy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Delivery Boy Details Modal */}
        {showViewModal && selectedDeliveryBoy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
            <div className="bg-white w-full max-w-3xl h-full overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Delivery Boy Details</h2>
                <button onClick={() => { setShowViewModal(false); setSelectedDeliveryBoy(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {/* Basic Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Name</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedDeliveryBoy.name}</p>
                    </div>
                    {selectedDeliveryBoy.phone && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Phone</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedDeliveryBoy.phone}</p>
                      </div>
                    )}
                    {selectedDeliveryBoy.email && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Email</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedDeliveryBoy.email}</p>
                      </div>
                    )}
                    {selectedDeliveryBoy.vehicle_type && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Vehicle Type</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedDeliveryBoy.vehicle_type}</p>
                      </div>
                    )}
                    {selectedDeliveryBoy.license_number && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">License Number</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedDeliveryBoy.license_number}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Status</p>
                      <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                        selectedDeliveryBoy.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedDeliveryBoy.status || 'active'}
                      </span>
                    </div>
                    {selectedDeliveryBoy.address && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 mb-1">Address</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedDeliveryBoy.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600 mb-1">Total Deliveries</p>
                      <p className="text-2xl font-bold text-blue-900">0</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600 mb-1">Completed Today</p>
                      <p className="text-2xl font-bold text-green-900">0</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end">
                <button
                  onClick={() => { setShowViewModal(false); setSelectedDeliveryBoy(null); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
