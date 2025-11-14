// components/forms/BulkDealProductForm.js
"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, X, Minus, Package, Edit2 } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

export default function BulkDealProductForm({ dealId, dealName, onClose, onSuccess }) {
  const [products, setProducts] = useState([]);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [dealId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadIngredients(), loadExistingProducts()]);
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadExistingProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("deal_products")
        .select(`
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
                unit_id,
                units (
                  id,
                  name,
                  abbreviation
                )
              )
            )
          )
        `)
        .eq("deal_id", dealId)
        .order("created_at");

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedProducts = data.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description || "",
          quantity: product.quantity,
          flavors: (product.deal_product_flavors || []).map(flavor => ({
            id: flavor.id,
            name: flavor.flavor_name,
            ingredients: (flavor.deal_product_flavor_ingredients || []).map(ing => ({
              id: ing.id,
              inventory_item_id: ing.inventory_item_id,
              quantity_per_item: ing.quantity_per_item,
              inventory_item: ing.inventory_items
            }))
          }))
        }));
        setProducts(formattedProducts);
      }
    } catch (error) {
      console.error("Error loading existing products:", error);
      toast.error("Failed to load existing products: " + error.message);
    }
  };

  const loadIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          id,
          name,
          current_stock,
          unit_id,
          units (
            id,
            name,
            abbreviation
          )
        `)
        .order("name");

      if (error) throw error;

      setAvailableIngredients(data || []);

      if (!data || data.length === 0) {
        toast.info("No inventory items found. Please add items to your inventory first.");
      }
    } catch (error) {
      console.error("Error loading ingredients:", error);
      toast.error("Failed to load ingredients: " + (error.message || "Unknown error"));
    }
  };

  const addNewProduct = () => {
    const newProduct = {
      id: `temp-${Date.now()}`,
      name: "",
      description: "",
      quantity: 1,
      flavors: []
    };
    setProducts([...products, newProduct]);
  };

  const removeProduct = async (productId) => {
    // If it's an existing product (not a temp one), delete it from database
    if (!productId.toString().startsWith('temp-')) {
   

      try {
        const { error } = await supabase
          .from('deal_products')
          .delete()
          .eq('id', productId);

        if (error) throw error;
        toast.success('Product deleted successfully');
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product: ' + error.message);
        return;
      }
    }

    setProducts(products.filter(p => p.id !== productId));
  };

  const updateProduct = (productId, field, value) => {
    setProducts(products.map(p =>
      p.id === productId ? { ...p, [field]: value } : p
    ));
  };

  const addFlavorToProduct = (productId, flavorName) => {
    if (!flavorName.trim()) {
      toast.error("Please enter a flavor name");
      return;
    }

    setProducts(products.map(p => {
      if (p.id === productId) {
        if (p.flavors.some(f => f.name.toLowerCase() === flavorName.trim().toLowerCase())) {
          toast.error("This flavor already exists for this product");
          return p;
        }

        const newFlavor = {
          id: `temp-flavor-${Date.now()}`,
          name: flavorName.trim(),
          ingredients: []
        };

        return { ...p, flavors: [...p.flavors, newFlavor] };
      }
      return p;
    }));
  };

  const removeFlavorFromProduct = (productId, flavorId) => {
    setProducts(products.map(p =>
      p.id === productId
        ? { ...p, flavors: p.flavors.filter(f => f.id !== flavorId) }
        : p
    ));
  };

  const addIngredientToFlavor = (productId, flavorId, ingredientId, quantity) => {
    if (!ingredientId || !quantity || parseFloat(quantity) <= 0) {
      toast.error("Please select ingredient and enter valid quantity");
      return;
    }

    const ingredient = availableIngredients.find(i => i.id === ingredientId);
    if (!ingredient) return;

    setProducts(products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          flavors: p.flavors.map(f => {
            if (f.id === flavorId) {
              if (f.ingredients.some(i => i.inventory_item_id === ingredientId)) {
                toast.error("This ingredient is already added to this flavor");
                return f;
              }

              const newIngredient = {
                inventory_item_id: ingredientId,
                quantity_per_item: parseFloat(quantity),
                inventory_items: ingredient
              };

              return { ...f, ingredients: [...f.ingredients, newIngredient] };
            }
            return f;
          })
        };
      }
      return p;
    }));

    toast.success("Ingredient added");
  };

  const removeIngredientFromFlavor = (productId, flavorId, ingredientId) => {
    setProducts(products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          flavors: p.flavors.map(f =>
            f.id === flavorId
              ? { ...f, ingredients: f.ingredients.filter(i => i.inventory_item_id !== ingredientId) }
              : f
          )
        };
      }
      return p;
    }));
  };

  const getAllIngredients = () => {
    const allIngredients = [];

    products.forEach(product => {
      product.flavors.forEach(flavor => {
        flavor.ingredients.forEach(ing => {
          const existing = allIngredients.find(i => i.inventory_item_id === ing.inventory_item_id);
          const totalRequired = ing.quantity_per_item * product.quantity;

          if (existing) {
            existing.totalQuantity += totalRequired;
          } else {
            allIngredients.push({
              inventory_item_id: ing.inventory_item_id,
              name: ing.inventory_items.name,
              totalQuantity: totalRequired,
              currentStock: ing.inventory_items.current_stock,
              unit: ing.inventory_items.units?.abbreviation || ''
            });
          }
        });
      });
    });

    return allIngredients;
  };

  const validateAll = () => {
    // Validate products
    for (const product of products) {
      if (!product.name.trim()) {
        toast.error("All products must have a name");
        return false;
      }

      if (!product.quantity || product.quantity <= 0) {
        toast.error("All products must have a valid quantity");
        return false;
      }

      // Validate stock
      for (const flavor of product.flavors) {
        for (const ing of flavor.ingredients) {
          const totalRequired = ing.quantity_per_item * product.quantity;
          if (totalRequired > ing.inventory_items.current_stock) {
            toast.error(
              `Insufficient stock for ${ing.inventory_items.name} in ${product.name} - ${flavor.name}. Required: ${totalRequired} ${ing.inventory_items.units?.abbreviation}, Available: ${ing.inventory_items.current_stock} ${ing.inventory_items.units?.abbreviation}`
            );
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (products.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    if (!validateAll()) {
      return;
    }

    setSubmitting(true);

    try {
      let newCount = 0;
      let updateCount = 0;

      // Save all products
      for (const product of products) {
        const isExisting = !product.id.toString().startsWith('temp-');
        let productData;

        if (isExisting) {
          // Update existing product
          const { data, error: productError } = await supabase
            .from("deal_products")
            .update({
              name: product.name,
              description: product.description,
              quantity: product.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id)
            .select()
            .single();

          if (productError) throw productError;
          productData = data;
          updateCount++;

          // Delete existing flavors and ingredients, then recreate them
          const { error: deleteError } = await supabase
            .from("deal_product_flavors")
            .delete()
            .eq('deal_product_id', product.id);

          if (deleteError) throw deleteError;
        } else {
          // Insert new product
          const { data, error: productError } = await supabase
            .from("deal_products")
            .insert({
              deal_id: dealId,
              name: product.name,
              description: product.description,
              quantity: product.quantity,
            })
            .select()
            .single();

          if (productError) throw productError;
          productData = data;
          newCount++;
        }

        // Insert/re-insert flavors and ingredients
        for (const flavor of product.flavors) {
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
      }

      const message = [];
      if (newCount > 0) message.push(`${newCount} product(s) added`);
      if (updateCount > 0) message.push(`${updateCount} product(s) updated`);

      toast.success(message.join(', '));
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving products:", error);
      toast.error("Failed to save products: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading ingredients...</p>
        </div>
      </div>
    );
  }

  const allIngredients = getAllIngredients();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Add Products to {dealName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Add multiple products with their flavors and ingredients at once
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content - Two Column Layout */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Column - Products List */}
          <div className="w-2/3 border-r border-gray-200 dark:border-slate-700 flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Products ({products.length})
              </h3>
              <button
                onClick={addNewProduct}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Product
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {products.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                  <Package className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
                  <p className="mt-4 text-gray-500 dark:text-gray-400">
                    No products added yet. Click "Add Product" to get started.
                  </p>
                </div>
              ) : (
                products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    availableIngredients={availableIngredients}
                    onUpdate={updateProduct}
                    onRemove={removeProduct}
                    onAddFlavor={addFlavorToProduct}
                    onRemoveFlavor={removeFlavorFromProduct}
                    onAddIngredient={addIngredientToFlavor}
                    onRemoveIngredient={removeIngredientFromFlavor}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Column - All Ingredients Summary */}
          <div className="w-1/3 flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Total Ingredients Required
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Combined ingredients across all products
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {allIngredients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No ingredients added yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allIngredients.map((ing) => {
                    const isInsufficient = ing.totalQuantity > ing.currentStock;

                    return (
                      <div
                        key={ing.inventory_item_id}
                        className={`p-4 rounded-lg border-2 ${
                          isInsufficient
                            ? "bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-800"
                            : "bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-800"
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white mb-2">
                          {ing.name}
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Required:</span>
                            <span className={`font-semibold ${
                              isInsufficient
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-900 dark:text-white"
                            }`}>
                              {ing.totalQuantity.toFixed(2)} {ing.unit}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Available:</span>
                            <span className={`font-semibold ${
                              isInsufficient
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }`}>
                              {ing.currentStock} {ing.unit}
                            </span>
                          </div>
                          {isInsufficient && (
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-2">
                              Insufficient stock!
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {products.length} product(s) ready to add
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || products.length === 0}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>Save All Products</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Product Card Component
function ProductCard({
  product,
  index,
  availableIngredients,
  onUpdate,
  onRemove,
  onAddFlavor,
  onRemoveFlavor,
  onAddIngredient,
  onRemoveIngredient
}) {
  const [newFlavorName, setNewFlavorName] = useState("");
  const [showAddFlavor, setShowAddFlavor] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleAddFlavor = () => {
    if (newFlavorName.trim()) {
      onAddFlavor(product.id, newFlavorName);
      setNewFlavorName("");
      setShowAddFlavor(false);
    }
  };

  const handleAddProduct = () => {
    // Validate before minimizing
    if (!product.name.trim()) {
      toast.error("Please enter product name first");
      return;
    }
    setIsMinimized(true);
  };

  const handleEditProduct = () => {
    setIsMinimized(false);
  };

  // Minimized view
  if (isMinimized) {
    return (
      <div className="bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-semibold text-gray-900 dark:text-white mb-1">
              {product.name} <span className="text-gray-500 dark:text-gray-400">x{product.quantity}</span>
            </div>
            {product.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{product.description}</p>
            )}
            {product.flavors && product.flavors.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {product.flavors.length} flavor(s) with ingredients configured
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              type="button"
              onClick={handleEditProduct}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onRemove(product.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expanded edit view
  return (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
      {/* Action buttons row */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-slate-600">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Product #{index + 1}
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddProduct}
            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
          <button
            type="button"
            onClick={() => onRemove(product.id)}
            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product Name *
          </label>
          <input
            type="text"
            value={product.name}
            onChange={(e) => onUpdate(product.id, 'name', e.target.value)}
            placeholder="e.g., Large Pizza"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <input
            type="text"
            value={product.description}
            onChange={(e) => onUpdate(product.id, 'description', e.target.value)}
            placeholder="Brief description..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quantity in Deal *
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdate(product.id, 'quantity', Math.max(1, product.quantity - 1))}
              className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="1"
              value={product.quantity}
              onChange={(e) => onUpdate(product.id, 'quantity', parseInt(e.target.value) || 1)}
              className="w-16 text-center px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
            />
            <button
              type="button"
              onClick={() => onUpdate(product.id, 'quantity', product.quantity + 1)}
              className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Flavors Section */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Flavors ({product.flavors.length})
          </h4>
          {!showAddFlavor && (
            <button
              onClick={() => setShowAddFlavor(true)}
              className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Flavor
            </button>
          )}
        </div>

        {showAddFlavor && (
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={newFlavorName}
              onChange={(e) => setNewFlavorName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddFlavor();
                }
              }}
              placeholder="Flavor name..."
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
              autoFocus
            />
            <button
              onClick={handleAddFlavor}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddFlavor(false);
                setNewFlavorName("");
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="space-y-3">
          {product.flavors.map((flavor) => (
            <FlavorCard
              key={flavor.id}
              productId={product.id}
              productQuantity={product.quantity}
              flavor={flavor}
              availableIngredients={availableIngredients}
              onRemove={onRemoveFlavor}
              onAddIngredient={onAddIngredient}
              onRemoveIngredient={onRemoveIngredient}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Flavor Card Component
function FlavorCard({
  productId,
  productQuantity,
  flavor,
  availableIngredients,
  onRemove,
  onAddIngredient,
  onRemoveIngredient
}) {
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [ingredientQuantity, setIngredientQuantity] = useState("");

  const handleAdd = () => {
    if (selectedIngredient && ingredientQuantity) {
      onAddIngredient(productId, flavor.id, selectedIngredient, ingredientQuantity);
      setSelectedIngredient("");
      setIngredientQuantity("");
      setShowAddIngredient(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white">{flavor.name}</h5>
        <button
          onClick={() => onRemove(productId, flavor.id)}
          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {!showAddIngredient && (
        <button
          onClick={() => setShowAddIngredient(true)}
          className="w-full mb-2 text-xs px-3 py-1.5 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 text-gray-600 dark:text-gray-400 hover:text-green-600"
        >
          + Add Ingredient
        </button>
      )}

      {showAddIngredient && (
        <div className="mb-2 space-y-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
          <select
            value={selectedIngredient}
            onChange={(e) => setSelectedIngredient(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
          >
            <option value="">Select ingredient</option>
            {availableIngredients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.current_stock} {item.units?.abbreviation})
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.001"
            value={ingredientQuantity}
            onChange={(e) => setIngredientQuantity(e.target.value)}
            placeholder="Qty per item"
            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 px-2 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddIngredient(false);
                setSelectedIngredient("");
                setIngredientQuantity("");
              }}
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {flavor.ingredients.length > 0 && (
        <div className="space-y-1">
          {flavor.ingredients.map((ing) => {
            const totalRequired = ing.quantity_per_item * productQuantity;
            const isInsufficient = totalRequired > ing.inventory_items.current_stock;

            return (
              <div
                key={ing.inventory_item_id}
                className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-slate-700 rounded"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {ing.inventory_items.name}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {ing.quantity_per_item} {ing.inventory_items.units?.abbreviation} × {productQuantity} =
                    <span className={`ml-1 font-semibold ${isInsufficient ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                      {totalRequired.toFixed(2)} {ing.inventory_items.units?.abbreviation}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveIngredient(productId, flavor.id, ing.inventory_item_id)}
                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
