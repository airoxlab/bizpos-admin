'use client'
// components/inventory/ViewInventoryDetails.js
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';


export default function ViewInventoryDetails({ item, currentUser, onClose }) {
  const [stockHistory, setStockHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchStockHistory();
    }
  }, [item.id, currentUser]);

  const fetchStockHistory = async () => {
    if (!currentUser) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('stock_history')
      .select(`
        *,
        suppliers (name)
      `)
      .eq('inventory_item_id', item.id)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stock history:', error);
    } else {
      setStockHistory(data || []);
    }
    setLoading(false);
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

  const getTransactionTypeColor = (type) => {
    switch(type) {
      case 'purchase': return 'bg-green-100 text-green-800';
      case 'sale': return 'bg-red-100 text-red-800';
      case 'adjustment': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
      <div className="bg-white w-full max-w-3xl h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Item Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Item Information */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Item Name</p>
              <p className="text-lg font-semibold text-gray-900">{item.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">SKU</p>
              <p className="text-lg font-semibold text-gray-900">{item.sku}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Category</p>
              <p className="text-lg font-semibold text-gray-900">
                {item.inventory_categories?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Supplier</p>
              <p className="text-lg font-semibold text-gray-900">
                {item.suppliers?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Stock</p>
              <p className="text-lg font-semibold text-gray-900">
                {item.current_stock} {item.units?.abbreviation}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Minimum Stock</p>
              <p className="text-lg font-semibold text-gray-900">
                {item.minimum_stock} {item.units?.abbreviation}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Cost Per Unit</p>
              <p className="text-lg font-semibold text-gray-900">
                Rs. {parseFloat(item.cost_per_unit || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Cost</p>
              <p className="text-lg font-semibold text-gray-900">
                Rs. {parseFloat(item.average_cost || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Value</p>
              <p className="text-lg font-semibold text-gray-900">
                Rs. {parseFloat(item.total_value || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Last Purchase Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {item.last_purchase_date || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(item.status)}`}>
                {getStatusIcon(item.status)}
                {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Created At</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Stock History */}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock History</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading history...</p>
              </div>
            ) : stockHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No stock history available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stockHistory.map((history) => (
                  <div key={history.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTransactionTypeColor(history.transaction_type)}`}>
                        {history.transaction_type.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(history.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Quantity:</span>
                        <span className={`font-semibold ml-2 ${history.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {history.quantity > 0 ? '+' : ''}{history.quantity} {item.units?.abbreviation}
                        </span>
                      </div>
                      
                      {history.cost_per_unit && (
                        <div>
                          <span className="text-gray-600">Cost/Unit:</span>
                          <span className="font-semibold ml-2">Rs. {parseFloat(history.cost_per_unit).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {history.total_cost && (
                        <div>
                          <span className="text-gray-600">Total Cost:</span>
                          <span className="font-semibold ml-2">Rs. {parseFloat(history.total_cost).toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-gray-600">Before:</span>
                        <span className="font-semibold ml-2">{history.before_stock} {item.units?.abbreviation}</span>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">After:</span>
                        <span className="font-semibold ml-2">{history.after_stock} {item.units?.abbreviation}</span>
                      </div>
                      
                      {history.suppliers && (
                        <div>
                          <span className="text-gray-600">Supplier:</span>
                          <span className="font-semibold ml-2">{history.suppliers.name}</span>
                        </div>
                      )}
                      
                      {history.batch_number && (
                        <div>
                          <span className="text-gray-600">Batch:</span>
                          <span className="font-semibold ml-2">{history.batch_number}</span>
                        </div>
                      )}
                      
                      {history.expiry_date && (
                        <div>
                          <span className="text-gray-600">Expiry:</span>
                          <span className="font-semibold ml-2">{history.expiry_date}</span>
                        </div>
                      )}
                      
                      {history.notes && (
                        <div className="col-span-2 md:col-span-3">
                          <span className="text-gray-600">Notes:</span>
                          <span className="ml-2">{history.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}