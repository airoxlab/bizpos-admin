// components/inventory/AddStockForm.js
'use client'

import React, { useState } from 'react';
import { X, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
export default function AddStockForm({ item, onClose, onSuccess, suppliers, currentUser, onSupplierAdded }) {
  const [formData, setFormData] = useState({
    quantity: '',
    cost_per_unit: '',
    supplier_id: item.supplier_id || '',
    batch_number: '',
    expiry_date: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [showSupplierInput, setShowSupplierInput] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!currentUser) {
      alert('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      const quantity = parseFloat(formData.quantity);
      const costPerUnit = parseFloat(formData.cost_per_unit);
      const newStock = item.current_stock + quantity;

      // Calculate weighted average cost
      const totalOldValue = item.current_stock * item.average_cost;
      const totalNewValue = quantity * costPerUnit;
      const newAverageCost = (totalOldValue + totalNewValue) / newStock;

      // Update inventory item
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          current_stock: newStock,
          average_cost: newAverageCost,
          cost_per_unit: costPerUnit,
          total_value: newStock * newAverageCost,
          last_purchase_date: new Date().toISOString().split('T')[0],
          supplier_id: formData.supplier_id || item.supplier_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
        .eq('user_id', currentUser.id);

      if (updateError) throw updateError;

      // Add stock history
      const { error: historyError } = await supabase
        .from('stock_history')
        .insert([{
          inventory_item_id: item.id,
          transaction_type: 'purchase',
          quantity: quantity,
          cost_per_unit: costPerUnit,
          total_cost: quantity * costPerUnit,
          supplier_id: formData.supplier_id || item.supplier_id || null,
          batch_number: formData.batch_number || null,
          expiry_date: formData.expiry_date || null,
          notes: formData.notes || null,
          before_stock: item.current_stock,
          after_stock: newStock,
          user_id: currentUser.id
        }]);

      if (historyError) throw historyError;

      onSuccess();
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Error adding stock: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const newStock = formData.quantity ? 
    item.current_stock + parseFloat(formData.quantity) : item.current_stock;
  
  const newAverageCost = formData.quantity && formData.cost_per_unit ?
    ((item.current_stock * item.average_cost) + 
    (parseFloat(formData.quantity) * parseFloat(formData.cost_per_unit))) / newStock : item.average_cost;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Stock</h2>
            <p className="text-sm text-gray-600 mt-1">
              Item: <span className="font-semibold">{item.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Stock Info - Read Only */}
        <div className="p-6 bg-blue-50 border-b">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Current Information</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-blue-600">Current Stock</p>
              <p className="text-lg font-bold text-blue-900">
                {item.current_stock} {item.units?.abbreviation}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Average Cost</p>
              <p className="text-lg font-bold text-blue-900">
                Rs. {parseFloat(item.average_cost || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-600">SKU</p>
              <p className="text-lg font-bold text-blue-900">{item.sku}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Quantity and Cost */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Add * <span className="text-gray-500">({item.units?.abbreviation})</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Per Unit (Rs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="cost_per_unit"
                  value={formData.cost_per_unit}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
                {formData.cost_per_unit && item.average_cost && (
                  <div className="mt-2">
                    {parseFloat(formData.cost_per_unit) > item.average_cost ? (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Rs. {(parseFloat(formData.cost_per_unit) - item.average_cost).toFixed(2)} higher than current avg
                      </p>
                    ) : parseFloat(formData.cost_per_unit) < item.average_cost ? (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Rs. {(item.average_cost - parseFloat(formData.cost_per_unit)).toFixed(2)} lower than current avg
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600">Same as current average</p>
                    )}
                  </div>
                )}
              </div>
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    className="px-3 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors flex items-center gap-1"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                 // components/inventory/AddStockForm.js (Continued from previous)

                  <input
                    type="tel"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddSupplier}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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

            {/* Batch Number and Expiry Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Number
                </label>
                <input
                  type="text"
                  name="batch_number"
                  value={formData.batch_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., BATCH-2025-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Any additional notes about this stock..."
              />
            </div>

            {/* Preview Calculation */}
            {formData.quantity && formData.cost_per_unit && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-3">After Adding Stock:</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-green-600">New Total Stock</p>
                    <p className="text-lg font-bold text-green-900">
                      {newStock.toFixed(3)} {item.units?.abbreviation}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">New Avg Cost</p>
                    <p className="text-lg font-bold text-green-900">
                      Rs. {newAverageCost.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Purchase Total</p>
                    <p className="text-lg font-bold text-green-900">
                      Rs. {(parseFloat(formData.quantity) * parseFloat(formData.cost_per_unit)).toFixed(2)}
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
              disabled={loading || !formData.quantity || !formData.cost_per_unit}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Stock...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}