// components/inventory/AddInventoryForm.js - COMPLETE FILE
'use client'
import React, { useState } from 'react';
import { X, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AddInventoryForm({
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
    cost_per_unit: '',
    supplier_id: ''
  });

  const [loading, setLoading] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [showSupplierInput, setShowSupplierInput] = useState(false);
  const [showUnitInput, setShowUnitInput] = useState(false);
  const [isSkuManual, setIsSkuManual] = useState(false);
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

  // Auto-generate SKU
  const generateSKU = (name, categoryId) => {
    if (!name) return '';
    
    // Get first 3 letters of name
    const namePrefix = name
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    
    // Get category prefix
    const category = categories.find(c => c.id === categoryId);
    const catPrefix = category 
      ? category.name.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, '')
      : 'XX';
    
    // Generate random number
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    
    return `${namePrefix || 'ITM'}-${catPrefix}-${randomNum}`;
  };

  // Handle name change with auto SKU generation
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setFormData(prev => ({
      ...prev,
      name: newName,
      sku: isSkuManual ? prev.sku : generateSKU(newName, prev.category_id)
    }));
  };

  // Handle category change with auto SKU generation
  const handleCategoryChange = (e) => {
    const newCategoryId = e.target.value;
    setFormData(prev => ({
      ...prev,
      category_id: newCategoryId,
      sku: isSkuManual ? prev.sku : generateSKU(prev.name, newCategoryId)
    }));
  };

  // Handle manual SKU edit
  const handleSkuChange = (e) => {
    setIsSkuManual(true);
    setFormData(prev => ({
      ...prev,
      sku: e.target.value
    }));
  };

  // Regenerate SKU manually
  const handleRegenerateSku = () => {
    setIsSkuManual(false);
    setFormData(prev => ({
      ...prev,
      sku: generateSKU(prev.name, prev.category_id)
    }));
  };

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

    setFormData(prev => ({
      ...prev,
      category_id: data.id,
      sku: isSkuManual ? prev.sku : generateSKU(prev.name, data.id)
    }));
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
      // Calculate initial values
      const currentStock = parseFloat(formData.current_stock) || 0;
      const costPerUnit = parseFloat(formData.cost_per_unit) || 0;
      const totalValue = currentStock * costPerUnit;

      const insertData = {
        name: formData.name,
        sku: formData.sku,
        category_id: formData.category_id || null,
        unit_id: formData.unit_id,
        current_stock: currentStock,
        minimum_stock: parseFloat(formData.minimum_stock) || 0,
        cost_per_unit: costPerUnit,
        average_cost: costPerUnit,
        total_value: totalValue,
        supplier_id: formData.supplier_id || null,
        last_purchase_date: new Date().toISOString().split('T')[0],
        user_id: currentUser.id
      };

      const { data: inventoryItem, error: inventoryError } = await supabase
        .from('inventory_items')
        .insert([insertData])
        .select()
        .single();

      if (inventoryError) throw inventoryError;

      // Add initial stock history
      if (currentStock > 0) {
        const { error: historyError } = await supabase
          .from('stock_history')
          .insert([{
            inventory_item_id: inventoryItem.id,
            transaction_type: 'purchase',
            quantity: currentStock,
            cost_per_unit: costPerUnit,
            total_cost: totalValue,
            supplier_id: formData.supplier_id || null,
            before_stock: 0,
            after_stock: currentStock,
            notes: 'Initial stock',
            user_id: currentUser.id
          }]);

        if (historyError) throw historyError;
      }

      onSuccess();
    } catch (error) {
      console.error('Error adding inventory item:', error);
      alert('Error adding item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add New Inventory Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
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
                onChange={handleNameChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Chicken Breast"
              />
            </div>

            {/* SKU - Auto-generated */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU (Stock Keeping Unit) *
                <span className="text-xs text-gray-500 font-normal ml-2">
                  {isSkuManual ? 'Custom SKU' : 'Auto-generated, you can edit'}
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleSkuChange}
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="Will be auto-generated"
                />
                <button
                  type="button"
                  onClick={handleRegenerateSku}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Regenerate SKU"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Format: NAME-CAT-#### (e.g., CHI-ME-5847)
              </p>
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
                    onChange={handleCategoryChange}
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Stock *
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

            {/* Cost Per Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Per Unit (Rs.) *
              </label>
              <input
                type="number"
                step="0.01"
                name="cost_per_unit"
                value={formData.cost_per_unit}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            {/* Total Value Preview */}
            {formData.current_stock && formData.cost_per_unit && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium mb-2">Calculated Values:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-600">Total Value</p>
                    <p className="text-lg font-bold text-blue-900">
                      Rs. {(parseFloat(formData.current_stock) * parseFloat(formData.cost_per_unit)).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Average Cost</p>
                    <p className="text-lg font-bold text-blue-900">
                      Rs. {parseFloat(formData.cost_per_unit).toFixed(2)}
                    </p>
                  </div>
                </div>
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
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}