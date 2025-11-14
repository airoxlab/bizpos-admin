'use client'
// components/inventory/EditInventoryForm.js
import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function EditInventoryForm({
  item,
  onClose,
  onSuccess,
  categories,
  suppliers,
  units,
  currentUser,
  onCategoryAdded,
  onSupplierAdded,
  onUnitAdded
}) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    unit_id: '',
    current_stock: '',
    minimum_stock: '',
    supplier_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [showSupplierInput, setShowSupplierInput] = useState(false);
  const [showUnitInput, setShowUnitInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [newUnit, setNewUnit] = useState({
    name: '',
    abbreviation: ''
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        sku: item.sku || '',
        category_id: item.category_id || '',
        unit_id: item.unit_id || '',
        current_stock: item.current_stock || '',
        minimum_stock: item.minimum_stock || '',
        supplier_id: item.supplier_id || ''
      });
    }
  }, [item]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !currentUser) return;

    const { data, error } = await supabase
      .from('inventory_categories')
      .insert([{ name: newCategory.trim(), user_id: currentUser.id }])
      .select()
      .single();

    if (error) {
      alert('Error adding category: ' + error.message);
      return;
    }

    setFormData(prev => ({ ...prev, category_id: data.id }));
    setNewCategory('');
    setShowCategoryInput(false);
    onCategoryAdded();
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim() || !currentUser) {
      alert('Supplier name is required');
      return;
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert([{ ...newSupplier, user_id: currentUser.id }])
      .select()
      .single();

    if (error) {
      alert('Error adding supplier: ' + error.message);
      return;
    }

    setFormData(prev => ({ ...prev, supplier_id: data.id }));
    setNewSupplier({ name: '', phone: '', email: '' });
    setShowSupplierInput(false);
    onSupplierAdded();
  };

  const handleAddUnit = async () => {
    if (!newUnit.name.trim() || !newUnit.abbreviation.trim() || !currentUser) {
      alert('Unit name and abbreviation are required');
      return;
    }

    const { data, error } = await supabase
      .from('units')
      .insert([{ ...newUnit, user_id: currentUser.id }])
      .select()
      .single();

    if (error) {
      alert('Error adding unit: ' + error.message);
      return;
    }

    setFormData(prev => ({ ...prev, unit_id: data.id }));
    setNewUnit({ name: '', abbreviation: '' });
    setShowUnitInput(false);
    if (onUnitAdded) {
      onUnitAdded();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!currentUser) {
      alert('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      const newStock = parseFloat(formData.current_stock) || 0;
      const oldStock = parseFloat(item.current_stock) || 0;
      const stockChange = newStock - oldStock;

      const updateData = {
        name: formData.name,
        sku: formData.sku,
        category_id: formData.category_id || null,
        unit_id: formData.unit_id,
        current_stock: newStock,
        minimum_stock: parseFloat(formData.minimum_stock) || 0,
        supplier_id: formData.supplier_id || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('inventory_items')
        .update(updateData)
        .eq('id', item.id)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      // Add stock history if stock changed
      if (stockChange !== 0) {
        const transactionType = stockChange > 0 ? 'adjustment_in' : 'adjustment_out';
        const { error: historyError } = await supabase
          .from('stock_history')
          .insert([{
            inventory_item_id: item.id,
            transaction_type: transactionType,
            quantity: Math.abs(stockChange),
            before_stock: oldStock,
            after_stock: newStock,
            notes: 'Stock adjusted via edit form',
            user_id: currentUser.id
          }]);

        if (historyError) throw historyError;
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating inventory item:', error);
      alert('Error updating item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit Inventory Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Values Info */}
        <div className="p-6 bg-gray-50 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Information</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Current Stock</p>
              <p className="text-lg font-semibold text-gray-900">
                {item.current_stock} {item.units?.abbreviation}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Average Cost</p>
              <p className="text-lg font-semibold text-gray-900">
                Rs. {parseFloat(item.average_cost || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Value</p>
              <p className="text-lg font-semibold text-gray-900">
                Rs. {parseFloat(item.total_value || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Chicken Breast"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU (Stock Keeping Unit) *
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., CHK-001"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              {!showCategoryInput ? (
                <div className="flex gap-2">
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCategoryInput(true)}
                    className="px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter new category name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Category
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryInput(false);
                        setNewCategory('');
                      }}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              {!showUnitInput ? (
                <div className="flex gap-2">
                  <select
                    name="unit_id"
                    value={formData.unit_id}
                    onChange={handleInputChange}
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Unit</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.abbreviation})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowUnitInput(true)}
                    className="px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                </div>
              ) : (
                <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <input
                    type="text"
                    value={newUnit.name}
                    onChange={(e) => setNewUnit(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Unit Name (e.g., Kilogram) *"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={newUnit.abbreviation}
                    onChange={(e) => setNewUnit(prev => ({ ...prev, abbreviation: e.target.value }))}
                    placeholder="Abbreviation (e.g., kg) *"
                    maxLength="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddUnit}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Unit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUnitInput(false);
                        setNewUnit({ name: '', abbreviation: '' });
                      }}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier
              </label>
              {!showSupplierInput ? (
                <div className="flex gap-2">
                  <select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowSupplierInput(true)}
                    className="px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                </div>
              ) : (
                <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <input
                    type="text"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Supplier Name *"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="tel"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddSupplier}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Supplier
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSupplierInput(false);
                        setNewSupplier({ name: '', phone: '', email: '' });
                      }}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Current Stock and Minimum Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Stock *
                </label>
                <input
                  type="number"
                  step="0.001"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.000"
                />
                {formData.current_stock !== item.current_stock?.toString() && (
                  <p className="text-xs text-amber-600 mt-1">
                    Stock will change from {item.current_stock} to {formData.current_stock}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Stock Alert Level *
                </label>
                <input
                  type="number"
                  step="0.001"
                  name="minimum_stock"
                  value={formData.minimum_stock}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.000"
                />
              </div>
            </div>

            {/* Warning about stock changes */}
            {formData.current_stock !== item.current_stock?.toString() && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 font-medium mb-1">⚠️ Stock Adjustment Notice</p>
                <p className="text-xs text-amber-700">
                  Changing the stock directly will create an adjustment entry in the stock history. 
                  For regular purchases or usage, use the "Add Stock" or "Use Stock" buttons instead.
                </p>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6 mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}