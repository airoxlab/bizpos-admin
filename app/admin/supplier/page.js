'use client'
// pages/suppliers/index.js
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, X, Download, Phone, Mail, MapPin, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUser } from '@/lib/auth';

export default function SuppliersManagement() {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalPurchases: 0
  });

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    const user = await getUser();
    if (user) {
      setCurrentUser(user);
      fetchSuppliers(user.id);
    }
  };

  useEffect(() => {
    filterSuppliers();
  }, [searchTerm, suppliers]);

  const fetchSuppliers = async (userId) => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          inventory_items (count),
          stock_history (count)
        `)
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;

      // Calculate statistics
      const processedData = data.map(supplier => ({
        ...supplier,
        itemsCount: supplier.inventory_items?.[0]?.count || 0,
        purchasesCount: supplier.stock_history?.[0]?.count || 0
      }));

      setSuppliers(processedData);

      setStats({
        totalSuppliers: processedData.length,
        activeSuppliers: processedData.filter(s => s.itemsCount > 0).length,
        totalPurchases: processedData.reduce((sum, s) => sum + s.purchasesCount, 0)
      });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      alert('Error fetching suppliers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterSuppliers = () => {
    if (!searchTerm.trim()) {
      setFilteredSuppliers(suppliers);
      return;
    }

    const filtered = suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supplier.phone && supplier.phone.includes(searchTerm)) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredSuppliers(filtered);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: ''
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
        .from('suppliers')
        .insert([{ ...formData, user_id: currentUser.id }]);

      if (error) throw error;

      setShowAddModal(false);
      resetForm();
      fetchSuppliers(currentUser.id);
    } catch (error) {
      console.error('Error adding supplier:', error);
      alert('Error adding supplier: ' + error.message);
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
        .from('suppliers')
        .update(formData)
        .eq('id', selectedSupplier.id)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedSupplier(null);
      resetForm();
      fetchSuppliers(currentUser.id);
    } catch (error) {
      console.error('Error updating supplier:', error);
      alert('Error updating supplier: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) return;

    if (!currentUser) {
      alert('User not authenticated');
      return;
    }

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      fetchSuppliers(currentUser.id);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Error deleting supplier: ' + error.message);
    }
  };

  const openEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    });
    setShowEditModal(true);
  };

  const openViewModal = async (supplier) => {
    if (!currentUser) return;

    setLoading(true);
    setSelectedSupplier(supplier);
    setShowViewModal(true);

    try {
      // Fetch detailed information filtered by user_id
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('name, current_stock, units(abbreviation)')
        .eq('supplier_id', supplier.id)
        .eq('user_id', currentUser.id);

      if (itemsError) throw itemsError;

      const { data: history, error: historyError } = await supabase
        .from('stock_history')
        .select('*, inventory_items(name)')
        .eq('supplier_id', supplier.id)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;

      setSelectedSupplier({
        ...supplier,
        items: items || [],
        recentPurchases: history || []
      });
    } catch (error) {
      console.error('Error fetching supplier details:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (filteredSuppliers.length === 0) {
      alert('No suppliers to export');
      return;
    }

    // CSV Headers
    const headers = ['Name', 'Contact Person', 'Phone', 'Email', 'Address', 'Items Count', 'Purchases Count'];
    
    // CSV Rows
    const rows = filteredSuppliers.map(supplier => [
      supplier.name || '',
      supplier.contact_person || '',
      supplier.phone || '',
      supplier.email || '',
      supplier.address || '',
      supplier.itemsCount || 0,
      supplier.purchasesCount || 0
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
    link.setAttribute('download', `suppliers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && suppliers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading suppliers...</p>
        </div>
      </div>
    );
  }

return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Suppliers Management</h1>
          <p className="text-gray-600">Manage your suppliers and track purchase history</p>
        </div>
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSuppliers}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Suppliers</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeSuppliers}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <User className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Purchases</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalPurchases}</p>
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
                placeholder="Search suppliers by name, contact, phone, or email..."
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
                Add Supplier
              </button>
            </div>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchases</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                        {supplier.contact_person && (
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />
                            {supplier.contact_person}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {supplier.phone && (
                          <div className="text-sm text-gray-900 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {supplier.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {supplier.address ? (
                        <div className="text-sm text-gray-600 flex items-start gap-2 max-w-xs">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{supplier.address}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {supplier.itemsCount} items
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        {supplier.purchasesCount} purchases
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openViewModal(supplier)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(supplier)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete Supplier"
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

          {filteredSuppliers.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No suppliers found</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first supplier
              </button>
            </div>
          )}
        </div>

        {/* Add Supplier Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
            <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add New Supplier</h2>
                <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Al-Noor Suppliers"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Ahmed Khan"
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
                      placeholder="e.g., supplier@example.com"
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
                    Add Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Supplier Modal */}
        {showEditModal && selectedSupplier && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
            <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit Supplier</h2>
                <button onClick={() => { setShowEditModal(false); setSelectedSupplier(null); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleEdit} className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Al-Noor Suppliers"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Ahmed Khan"
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
                      placeholder="e.g., supplier@example.com"
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
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6 mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setSelectedSupplier(null); resetForm(); }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Supplier Details Modal */}
        {showViewModal && selectedSupplier && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
            <div className="bg-white w-full max-w-3xl h-full overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Supplier Details</h2>
                <button onClick={() => { setShowViewModal(false); setSelectedSupplier(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {/* Basic Information */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Supplier Name</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedSupplier.name}</p>
                    </div>
                    {selectedSupplier.contact_person && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Contact Person</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedSupplier.contact_person}</p>
                      </div>
                    )}
                    {selectedSupplier.phone && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Phone</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedSupplier.phone}</p>
                      </div>
                    )}
                    {selectedSupplier.email && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Email</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedSupplier.email}</p>
                      </div>
                    )}
                    {selectedSupplier.address && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 mb-1">Address</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedSupplier.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Supplied Items */}
                {selectedSupplier.items && selectedSupplier.items.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplied Items</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2">
                        {selectedSupplier.items.map((item, index) => (
                        // pages/suppliers/index.js (Continued from previous)

                          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                            <span className="text-sm font-medium text-gray-900">{item.name}</span>
                            <span className="text-sm text-gray-600">
                              Stock: {item.current_stock} {item.units?.abbreviation}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Purchases */}
                {selectedSupplier.recentPurchases && selectedSupplier.recentPurchases.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Purchase History</h3>
                    <div className="space-y-3">
                      {selectedSupplier.recentPurchases.map((purchase) => (
                        <div key={purchase.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {purchase.inventory_items?.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(purchase.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Quantity:</span>
                              <span className="font-semibold ml-2 text-green-600">
                                +{purchase.quantity}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Cost/Unit:</span>
                              <span className="font-semibold ml-2">
                                Rs. {parseFloat(purchase.cost_per_unit || 0).toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Total:</span>
                              <span className="font-semibold ml-2">
                                Rs. {parseFloat(purchase.total_cost || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {purchase.batch_number && (
                            <div className="mt-2 text-xs text-gray-600">
                              Batch: {purchase.batch_number}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statistics */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600 mb-1">Items Supplied</p>
                      <p className="text-2xl font-bold text-blue-900">{selectedSupplier.itemsCount || 0}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600 mb-1">Total Purchases</p>
                      <p className="text-2xl font-bold text-green-900">{selectedSupplier.purchasesCount || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end">
                <button
                  onClick={() => { setShowViewModal(false); setSelectedSupplier(null); }}
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