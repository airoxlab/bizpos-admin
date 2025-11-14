// app/admin/products/deals/new-page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import RightSidebar from "@/components/ui/RightSidebar";
import DealForm from "@/components/forms/DealForm";
import NewDealProductForm from "@/components/forms/NewDealProductForm";
import BulkDealProductForm from "@/components/forms/BulkDealProductForm";
import {
  Plus,
  Edit2,
  Package,
  Search,
  Grid3X3,
  List,
  Trash2,
  ShoppingBag,
  Eye,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  // Sidebar states
  const [showDealSidebar, setShowDealSidebar] = useState(false);
  const [showProductSidebar, setShowProductSidebar] = useState(false);
  const [showBulkProductModal, setShowBulkProductModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadDeals();
  }, []);

  useEffect(() => {
    let filtered = deals;

    if (searchTerm) {
      filtered = deals.filter(
        (deal) =>
          deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (deal.description &&
            deal.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredDeals(filtered);
  }, [searchTerm, deals]);

  const loadDeals = async () => {
    try {
      const user = await getUser();
      if (!user) {
        toast.error("Please log in to view deals");
        return;
      }

      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          deal_products (
            id,
            name,
            description,
            quantity,
            deal_product_flavors (
              id,
              flavor_name,
              deal_product_flavor_ingredients (
                id,
                inventory_item_id,
                quantity_per_item,
                inventory_items (
                  id,
                  name,
                  current_stock,
                  units (
                    id,
                    name,
                    abbreviation
                  )
                )
              )
            )
          )
        `)
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      setDeals(data || []);
    } catch (error) {
      console.error("Error loading deals:", error);
      toast.error("Failed to load deals: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeal = () => {
    setEditingDeal(null);
    setShowDealSidebar(true);
  };

  const handleEditDeal = (deal) => {
    setEditingDeal(deal);
    setShowDealSidebar(true);
  };

  const handleSaveDeal = async (formData) => {
    try {
      const user = await getUser();
      if (!user) {
        toast.error("Please log in");
        return;
      }

      if (editingDeal) {
        // Update existing deal
        const { error } = await supabase
          .from("deals")
          .update({
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            image_url: formData.image_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingDeal.id)
          .eq("user_id", user.id);

        if (error) throw error;

        toast.success("Deal updated successfully");
      } else {
        // Create new deal
        const { error } = await supabase.from("deals").insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          image_url: formData.image_url || null,
          is_active: true,
          sort_order: deals.length,
        });

        if (error) throw error;

        toast.success("Deal created successfully");
      }

      // Close sidebar and reset
      setShowDealSidebar(false);
      setEditingDeal(null);

      // Reload deals to show the new/updated deal with image
      await loadDeals(user);
    } catch (error) {
      console.error("Error saving deal:", error);
      toast.error("Failed to save deal: " + error.message);
    }
  };

  const handleDeleteDeal = async (dealId) => {
    if (!confirm("Are you sure you want to delete this deal?")) return;

    try {
      const user = await getUser();
      if (!user) {
        toast.error("Please log in");
        return;
      }

      const { error } = await supabase
        .from("deals")
        .delete()
        .eq("id", dealId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Deal deleted successfully");
      loadDeals();
    } catch (error) {
      console.error("Error deleting deal:", error);
      toast.error("Failed to delete deal: " + error.message);
    }
  };

  const handleAddProduct = (deal) => {
    setSelectedDeal(deal);
    setEditingProduct(null);
    setShowProductSidebar(true);
  };

  const handleAddProductsBulk = (deal) => {
    setSelectedDeal(deal);
    setShowBulkProductModal(true);
  };

  const handleEditProduct = (deal, product) => {
    setSelectedDeal(deal);
    setEditingProduct(product);
    setShowProductSidebar(true);
  };

  const handleSaveProduct = async (formData) => {
    try {
      const user = await getUser();
      if (!user) {
        toast.error("Please log in");
        return;
      }

      if (editingProduct) {
        // Update existing product
        const { error: productError } = await supabase
          .from("deal_products")
          .update({
            name: formData.name,
            description: formData.description,
            quantity: formData.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingProduct.id)
          .select()
          .single();

        if (productError) throw productError;

        // Delete existing flavors and ingredients
        const { error: deleteError } = await supabase
          .from("deal_product_flavors")
          .delete()
          .eq("deal_product_id", editingProduct.id);

        if (deleteError) throw deleteError;

        // Insert new flavors and ingredients
        for (const flavor of formData.flavors) {
          const { data: flavorData, error: flavorError } = await supabase
            .from("deal_product_flavors")
            .insert({
              deal_product_id: editingProduct.id,
              flavor_name: flavor.name,
            })
            .select()
            .single();

          if (flavorError) throw flavorError;

          // Insert ingredients for this flavor
          if (flavor.ingredients && flavor.ingredients.length > 0) {
            const ingredientsToInsert = flavor.ingredients.map((ing) => ({
              deal_product_flavor_id: flavorData.id,
              inventory_item_id: ing.inventory_item_id,
              quantity_per_item: ing.quantity_per_item,
            }));

            const { error: ingredientsError } = await supabase
              .from("deal_product_flavor_ingredients")
              .insert(ingredientsToInsert);

            if (ingredientsError) throw ingredientsError;
          }
        }

        toast.success("Product updated successfully");
      } else {
        // Create new product
        const { data: productData, error: productError } = await supabase
          .from("deal_products")
          .insert({
            deal_id: selectedDeal.id,
            name: formData.name,
            description: formData.description,
            quantity: formData.quantity,
          })
          .select()
          .single();

        if (productError) throw productError;

        // Insert flavors and ingredients
        for (const flavor of formData.flavors) {
          const { data: flavorData, error: flavorError } = await supabase
            .from("deal_product_flavors")
            .insert({
              deal_product_id: productData.id,
              flavor_name: flavor.name,
            })
            .select()
            .single();

          if (flavorError) throw flavorError;

          // Insert ingredients for this flavor
          if (flavor.ingredients && flavor.ingredients.length > 0) {
            const ingredientsToInsert = flavor.ingredients.map((ing) => ({
              deal_product_flavor_id: flavorData.id,
              inventory_item_id: ing.inventory_item_id,
              quantity_per_item: ing.quantity_per_item,
            }));

            const { error: ingredientsError } = await supabase
              .from("deal_product_flavor_ingredients")
              .insert(ingredientsToInsert);

            if (ingredientsError) throw ingredientsError;
          }
        }

        toast.success("Product added successfully");
      }

      setShowProductSidebar(false);
      setEditingProduct(null);
      setSelectedDeal(null);
      loadDeals();
      return true; // Return success
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product: " + error.message);
      return false; // Return failure
    }
  };

  const handleDeleteProduct = async (productId) => {

    try {
      const { error } = await supabase
        .from("deal_products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      toast.success("Product deleted successfully");
      loadDeals();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Deals
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your special deals and offers
          </p>
        </div>
        <button
          onClick={handleCreateDeal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Deal</span>
        </button>
      </div>

      {/* Deals Grid */}
      {filteredDeals.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            No deals found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Create your first deal to start offering special packages to your customers.
          </p>
          <button
            onClick={handleCreateDeal}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Your First Deal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onEdit={() => handleEditDeal(deal)}
              onDelete={() => handleDeleteDeal(deal.id)}
              onAddProductsBulk={() => handleAddProductsBulk(deal)}
              onEditProduct={(product) => handleEditProduct(deal, product)}
              onDeleteProduct={handleDeleteProduct}
            />
          ))}
        </div>
      )}

      {/* Deal Sidebar */}
      <RightSidebar
        isOpen={showDealSidebar}
        onClose={() => {
          setShowDealSidebar(false);
          setEditingDeal(null);
        }}
        title={editingDeal ? "Edit Deal" : "Create New Deal"}
      >
        <DealForm deal={editingDeal} onSave={handleSaveDeal} />
      </RightSidebar>

      {/* Product Sidebar */}
      <RightSidebar
        isOpen={showProductSidebar}
        onClose={() => {
          setShowProductSidebar(false);
          setEditingProduct(null);
          setSelectedDeal(null);
        }}
        title={editingProduct ? "Edit Product" : "Add Product to Deal"}
      >
        <NewDealProductForm
          dealId={selectedDeal?.id}
          initialData={editingProduct}
          onSubmit={handleSaveProduct}
          onCancel={() => {
            setShowProductSidebar(false);
            setEditingProduct(null);
            setSelectedDeal(null);
          }}
        />
      </RightSidebar>

      {/* Bulk Product Modal */}
      {showBulkProductModal && selectedDeal && (
        <BulkDealProductForm
          dealId={selectedDeal.id}
          dealName={selectedDeal.name}
          onClose={() => {
            setShowBulkProductModal(false);
            setSelectedDeal(null);
          }}
          onSuccess={() => {
            loadDeals();
          }}
        />
      )}
    </div>
  );
}

// Deal Card Component
function DealCard({ deal, onEdit, onDelete, onAddProductsBulk, onEditProduct, onDeleteProduct }) {
  const [showViewModal, setShowViewModal] = useState(false);

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
        {/* Deal Image or Placeholder - Fixed Height */}
        {deal.image_url ? (
          <div className="w-full h-40 overflow-hidden flex-shrink-0">
            <img
              src={deal.image_url}
              alt={deal.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-16 h-16 text-white opacity-50" />
          </div>
        )}

        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center flex-1 min-w-0">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {deal.name}
                </h3>
                {deal.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                    {deal.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
              <button
                onClick={onAddProductsBulk}
                className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                title="Add products"
              >
                <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
              </button>
              <button
                onClick={onEdit}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Edit deal"
              >
                <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete deal"
              >
                <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Price:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                Rs {parseFloat(deal.price).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Products:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {deal.deal_products?.length || 0}
              </span>
            </div>
          </div>

          {/* Fixed height products section */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-3 mt-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Products ({deal.deal_products?.length || 0})
              </div>
              <button
                onClick={() => setShowViewModal(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                View All
              </button>
            </div>
            {deal.deal_products && deal.deal_products.length > 0 ? (
              <div className="space-y-1.5 h-24 overflow-y-auto">
                {deal.deal_products.slice(0, 2).map((product) => (
                  <div
                    key={product.id}
                    className="text-sm p-2.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-700/30 rounded-lg border border-gray-200 dark:border-slate-600"
                  >
                    <div className="font-medium text-gray-900 dark:text-white truncate flex items-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold mr-2">
                        {product.quantity}
                      </span>
                      {product.name}
                    </div>
                    {product.deal_product_flavors && product.deal_product_flavors.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
                        {product.deal_product_flavors.length} flavor(s)
                      </div>
                    )}
                  </div>
                ))}
                {deal.deal_products.length > 2 && (
                  <div className="text-xs text-center text-indigo-600 dark:text-indigo-400 font-medium py-1">
                    +{deal.deal_products.length - 2} more product{deal.deal_products.length - 2 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center bg-gray-50 dark:bg-slate-700/30 rounded-lg border border-dashed border-gray-300 dark:border-slate-600">
                <p className="text-xs text-gray-400 dark:text-gray-500">No products added yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View All Products Modal */}
      {showViewModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowViewModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="px-6 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 border-b border-indigo-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {deal.name}
                      </h2>
                      <p className="text-sm text-indigo-100 mt-0.5">
                        {deal.deal_products?.length || 0} product{deal.deal_products?.length !== 1 ? 's' : ''} • Rs {parseFloat(deal.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-3">
                  {deal.deal_products && deal.deal_products.length > 0 ? (
                    deal.deal_products.map((product) => (
                      <div
                        key={product.id}
                        className="group flex items-start justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-700/30 rounded-lg border border-gray-200 dark:border-slate-600 hover:shadow-md transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                              {product.quantity}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {product.name}
                            </span>
                          </div>
                          {product.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 ml-9">
                              {product.description}
                            </p>
                          )}
                          {product.deal_product_flavors && product.deal_product_flavors.length > 0 && (
                            <div className="mt-2 ml-9">
                              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                Flavors ({product.deal_product_flavors.length}):
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {product.deal_product_flavors.map((flavor, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-slate-600"
                                  >
                                    <span className="font-medium text-gray-900 dark:text-white">{flavor.name}</span>
                                    {flavor.deal_flavor_ingredients && flavor.deal_flavor_ingredients.length > 0 && (
                                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                                        • {flavor.deal_flavor_ingredients.length} ingredient{flavor.deal_flavor_ingredients.length !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setShowViewModal(false);
                              onEditProduct(product);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Edit product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this product?')) {
                                onDeleteProduct(product.id);
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No products added yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "Add Products" to get started</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    onAddProductsBulk();
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Products
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

