// components/deals/DealProductsManager.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { Plus, Trash2, Package, Search, X } from "lucide-react";
import toast from "react-hot-toast";

export default function DealProductsManager({ dealId, onClose }) {
  const [dealProducts, setDealProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [allowFlavorChange, setAllowFlavorChange] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  useEffect(() => {
    loadDealProducts();
    loadAllProducts();
    loadCategories();
  }, [dealId]);

  const loadDealProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("deal_products")
        .select(
          `
          *,
          products (
            id,
            name,
            image_url,
            base_price
          ),
          product_variants (
            id,
            name,
            price
          )
        `
        )
        .eq("deal_id", dealId);

      if (error) throw error;
      setDealProducts(data || []);
    } catch (error) {
      console.error("Error loading deal products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const user = await getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadAllProducts = async () => {
    try {
      const user = await getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          categories (
            id,
            name
          ),
          product_variants (
            id,
            name,
            price,
            sort_order
          )
        `
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;

      const productsWithSortedVariants = data.map((product) => ({
        ...product,
        product_variants: product.product_variants?.sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      }));

      setAllProducts(productsWithSortedVariants || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    if (product.product_variants?.length > 0) {
      setSelectedVariant(product.product_variants[0]);
    } else {
      setSelectedVariant(null);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }

    if (selectedProduct.product_variants?.length > 0 && !selectedVariant) {
      toast.error("Please select a variant");
      return;
    }

    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    const exists = dealProducts.some((item) => {
      if (selectedProduct.product_variants?.length > 0) {
        return (
          item.product_id === selectedProduct.id &&
          item.variant_id === selectedVariant.id
        );
      } else {
        return item.product_id === selectedProduct.id;
      }
    });

    if (exists) {
      toast.error("This product is already in the deal");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("deal_products").insert({
        deal_id: dealId,
        product_id: selectedProduct.id,
        variant_id: selectedVariant?.id || null,
        quantity: quantity,
        allow_flavor_change:
          selectedProduct.product_variants?.length > 0
            ? allowFlavorChange
            : false,
      });

      if (error) throw error;

      toast.success("Product added to deal");
      setShowAddModal(false);
      setSelectedProduct(null);
      setSelectedVariant(null);
      setQuantity(1);
      setAllowFlavorChange(true);
      loadDealProducts();
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (dealProduct) => {
    setProductToDelete(dealProduct);
    setShowDeleteConfirm(true);
  };

  const handleRemoveProduct = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from("deal_products")
        .delete()
        .eq("id", productToDelete.id);

      if (error) throw error;

      toast.success("Product removed from deal");
      setShowDeleteConfirm(false);
      setProductToDelete(null);
      loadDealProducts();
    } catch (error) {
      console.error("Error removing product:", error);
      toast.error("Failed to remove product");
    }
  };

  const handleUpdateQuantity = async (dealProductId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      const { error } = await supabase
        .from("deal_products")
        .update({ quantity: newQuantity })
        .eq("id", dealProductId);

      if (error) throw error;

      setDealProducts(
        dealProducts.map((item) =>
          item.id === dealProductId ? { ...item, quantity: newQuantity } : item
        )
      );
      toast.success("Quantity updated");
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  const handleToggleFlavorChange = async (dealProductId, currentValue) => {
    try {
      const { error } = await supabase
        .from("deal_products")
        .update({ allow_flavor_change: !currentValue })
        .eq("id", dealProductId);

      if (error) throw error;

      setDealProducts(
        dealProducts.map((item) =>
          item.id === dealProductId
            ? { ...item, allow_flavor_change: !currentValue }
            : item
        )
      );
      toast.success("Flavor settings updated");
    } catch (error) {
      console.error("Error updating flavor settings:", error);
      toast.error("Failed to update settings");
    }
  };

  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Current Products - Fixed Height */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Products in Deal ({dealProducts.length})
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-1 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>

        {dealProducts.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
            <Package className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              No products added yet
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Product</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {dealProducts.map((item) => (
              <div
                key={item.id}
                className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 flex flex-col"
              >
                <div className="flex items-start space-x-3 mb-3">
                  {item.products?.image_url ? (
                    <img
                      src={item.products.image_url}
                      alt={item.products.name}
                      className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-slate-600 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-200 dark:bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-7 h-7 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {item.products?.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {item.product_variants ? (
                        <>
                          {item.product_variants.name} • Rs{" "}
                          {item.product_variants.price}
                        </>
                      ) : (
                        <>Rs {item.products?.base_price}</>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteClick(item)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <label className="text-xs text-gray-600 dark:text-gray-400">
                      Qty:
                    </label>
                    <button
                      onClick={() =>
                        handleUpdateQuantity(item.id, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                      className="w-6 h-6 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateQuantity(
                          item.id,
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="w-10 h-6 text-center border border-gray-300 dark:border-slate-500 rounded bg-white dark:bg-slate-600 text-gray-900 dark:text-white text-xs"
                      min="1"
                    />
                    <button
                      onClick={() =>
                        handleUpdateQuantity(item.id, item.quantity + 1)
                      }
                      className="w-6 h-6 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-500 transition-colors text-xs"
                    >
                      +
                    </button>
                  </div>

                  {item.product_variants && (
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.allow_flavor_change}
                        onChange={() =>
                          handleToggleFlavorChange(
                            item.id,
                            item.allow_flavor_change
                          )
                        }
                        className="w-3 h-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        Flavor
                      </span>
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Product Section - Takes Remaining Space */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setShowAddModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add Product to Deal
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col p-6">
                {/* Search */}
                <div className="relative mb-4 flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Category Tabs */}
                <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-2 flex-shrink-0">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                      selectedCategory === "all"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    All Products ({allProducts.length})
                  </button>
                  {categories.map((category) => {
                    const count = allProducts.filter(
                      (p) => p.category_id === category.id
                    ).length;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                          selectedCategory === category.id
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        {category.name} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Products Grid - Scrollable */}
                <div className="flex-1 overflow-y-auto mb-4">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No products found
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            selectedProduct?.id === product.id
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md"
                              : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:shadow"
                          }`}
                        >
                          <div className="flex flex-col space-y-2">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-24 object-cover rounded"
                              />
                            ) : (
                              <div className="w-full h-24 bg-gray-200 dark:bg-slate-600 rounded flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {product.product_variants?.length > 0
                                  ? `${product.product_variants.length} variants`
                                  : `Rs ${product.base_price}`}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selection Panel - Fixed at Bottom */}
                {selectedProduct && (
                  <div className="flex-shrink-0 pt-4 border-t border-gray-200 dark:border-slate-700 space-y-4">
                    {/* Variant Selection */}
                    {selectedProduct.product_variants?.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Select Variant *
                        </label>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {selectedProduct.product_variants.map((variant) => (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => setSelectedVariant(variant)}
                              className={`p-2 rounded-lg border-2 transition-all ${
                                selectedVariant?.id === variant.id
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                  : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
                              }`}
                            >
                              <p className="font-medium text-gray-900 dark:text-white text-xs">
                                {variant.name}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                Rs {variant.price}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity & Options */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Quantity *
                        </label>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() =>
                              setQuantity(Math.max(1, quantity - 1))
                            }
                            className="w-9 h-9 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) =>
                              setQuantity(
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            className="w-16 h-9 text-center border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            min="1"
                          />
                          <button
                            type="button"
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-9 h-9 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {selectedProduct.product_variants?.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Options
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer h-9">
                            <input
                              type="checkbox"
                              checked={allowFlavorChange}
                              onChange={(e) =>
                                setAllowFlavorChange(e.target.checked)
                              }
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-900 dark:text-white">
                              Allow flavor/variant change
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end space-x-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  disabled={
                    !selectedProduct ||
                    (selectedProduct.product_variants?.length > 0 &&
                      !selectedVariant) ||
                    submitting
                  }
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? "Adding..." : "Add Product"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && productToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Remove Product
                </h2>
              </div>

              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium mb-2">
                      Are you sure you want to remove "
                      {productToDelete.products?.name}" from this deal?
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveProduct}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Remove Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}