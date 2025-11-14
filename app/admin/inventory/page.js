'use client'
// pages/inventory/index.js
import React, { useState, useEffect } from 'react';
import { Search, Filter, Package, AlertTriangle, TrendingDown, TrendingUp, Plus, Eye, Edit2, Trash2, PackagePlus, FolderPlus, FileText } from 'lucide-react';
import AddInventoryForm from '@/components/inventory/AddInventoryForm';
import EditInventoryForm from '@/components/inventory/EditInventoryForm';
import AddStockForm from '@/components/inventory/AddStockForm';
import ViewInventoryDetails from '@/components/inventory/ViewInventoryDetails';
import { supabase } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function InventoryManagement() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categorySearch, setCategorySearch] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
const router = useRouter();

  // Statistics
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    criticalItems: 0,
    totalValue: 0
  });

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [inventoryItems]);

  const initializeUser = async () => {
    const user = await getUser();
    if (user) {
      setCurrentUser(user);
      fetchInitialData(user.id);
    }
  };

  const fetchInitialData = async (userId) => {
    if (!userId) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchInventoryItems(userId),
        fetchCategories(userId),
        fetchSuppliers(userId),
        fetchUnits(userId)
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async (userId) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        inventory_categories (id, name),
        suppliers (id, name),
        units (id, name, abbreviation)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inventory:', error);
      return;
    }

    setInventoryItems(data || []);
  };

  const fetchCategories = async (userId) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('inventory_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const fetchSuppliers = async (userId) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      console.error('Error fetching suppliers:', error);
      return;
    }

    setSuppliers(data || []);
  };

  const fetchUnits = async (userId) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      console.error('Error fetching units:', error);
      return;
    }

    setUnits(data || []);
  };

  const calculateStats = () => {
    const totalItems = inventoryItems.length;
    const lowStockItems = inventoryItems.filter(item => item.status === 'low' || item.status === 'critical').length;
    const criticalItems = inventoryItems.filter(item => item.status === 'critical').length;
    const totalValue = inventoryItems.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0);

    setStats({
      totalItems,
      lowStockItems,
      criticalItems,
      totalValue
    });
  };

  const handleDelete = async (id) => {
    if (!currentUser) {
      alert('User not authenticated');
      return;
    }

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id);

    if (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item');
      return;
    }

    fetchInventoryItems(currentUser.id);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const openViewModal = (item) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };

  const openAddStockModal = (item) => {
    setSelectedItem(item);
    setShowAddStockModal(true);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'critical' || status === 'low') {
      return <AlertTriangle className="w-4 h-4" />;
    }
    return null;
  };

  // Filter items
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

 return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
          <p className="text-gray-600">Track and manage your restaurant inventory in real-time</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <TrendingDown className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Critical Items</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalItems}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Value</p>
                <p className="text-2xl font-bold text-green-600">Rs. {stats.totalValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="text-gray-400 w-5 h-5" />
              <div className="relative flex-1">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-10"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Add Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto justify-center"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
       
<button
  onClick={() => router.push('/admin/inventory/transactions')}
  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
>
  <FileText className="w-5 h-5" />
  View Transactions
</button>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                       {item.inventory_categories?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.current_stock} {item.units?.abbreviation}</div>
                      <div className="text-xs text-gray-500">Min: {item.minimum_stock} {item.units?.abbreviation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {parseFloat(item.average_cost || 0).toFixed(2)}
                    </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
  {item.current_stock >= 0 ? (
    `Rs. ${parseFloat(item.total_value || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}`
  ) : (
    <span className="text-red-600">
      Rs. 0 <span className="text-xs">(Negative Stock)</span>
    </span>
  )}
</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openAddStockModal(item)}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="Add Stock"
                        >
                          <PackagePlus className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openViewModal(item)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Edit Item"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete Item"
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

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No items found</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first item
              </button>
            </div>
          )}
        </div>

        {/* Modals */}
        {showAddModal && currentUser && (
          <AddInventoryForm
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              fetchInventoryItems(currentUser.id);
            }}
            categories={categories}
            suppliers={suppliers}
            units={units}
            currentUser={currentUser}
            onCategoryAdded={() => fetchCategories(currentUser.id)}
            onSupplierAdded={() => fetchSuppliers(currentUser.id)}
            onUnitAdded={() => fetchUnits(currentUser.id)}
          />
        )}

        {showEditModal && selectedItem && currentUser && (
          <EditInventoryForm
            item={selectedItem}
            onClose={() => {
              setShowEditModal(false);
              setSelectedItem(null);
            }}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedItem(null);
              fetchInventoryItems(currentUser.id);
            }}
            categories={categories}
            suppliers={suppliers}
            units={units}
            currentUser={currentUser}
            onCategoryAdded={() => fetchCategories(currentUser.id)}
            onSupplierAdded={() => fetchSuppliers(currentUser.id)}
            onUnitAdded={() => fetchUnits(currentUser.id)}
          />
        )}

        {showAddStockModal && selectedItem && currentUser && (
          <AddStockForm
            item={selectedItem}
            onClose={() => {
              setShowAddStockModal(false);
              setSelectedItem(null);
            }}
            onSuccess={() => {
              setShowAddStockModal(false);
              setSelectedItem(null);
              fetchInventoryItems(currentUser.id);
            }}
            suppliers={suppliers}
            currentUser={currentUser}
            onSupplierAdded={() => fetchSuppliers(currentUser.id)}
          />
        )}

        {showViewModal && selectedItem && currentUser && (
          <ViewInventoryDetails
            item={selectedItem}
            currentUser={currentUser}
            onClose={() => {
              setShowViewModal(false);
              setSelectedItem(null);
            }}
          />
        )}
      </div>
    </div>
  );
}