// components/forms/NewDealProductForm.js
"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, X, Minus, Package } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

export default function NewDealProductForm({ dealId, onSubmit, onCancel, initialData }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: 1,
  });

  const [flavors, setFlavors] = useState([]);
  const [newFlavorName, setNewFlavorName] = useState("");
  const [showAddFlavor, setShowAddFlavor] = useState(false);

  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [flavorIngredients, setFlavorIngredients] = useState({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        quantity: initialData.quantity || 1,
      });

      // Load existing flavors
      if (initialData.deal_product_flavors) {
        const existingFlavors = initialData.deal_product_flavors.map(f => ({
          id: f.id,
          name: f.flavor_name
        }));
        setFlavors(existingFlavors);

        // Load existing ingredients per flavor
        const ingredientsMap = {};
        initialData.deal_product_flavors.forEach(flavor => {
          if (flavor.deal_product_flavor_ingredients) {
            ingredientsMap[flavor.id] = flavor.deal_product_flavor_ingredients.map(ing => ({
              inventory_item_id: ing.inventory_item_id,
              quantity_per_item: ing.quantity_per_item,
              inventory_items: ing.inventory_items
            }));
          }
        });
        setFlavorIngredients(ingredientsMap);
      }
    }
  }, [initialData]);

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
    } finally {
      setLoading(false);
    }
  };

  // Flavor Management
  const handleAddFlavor = () => {
    if (!newFlavorName.trim()) {
      toast.error("Please enter a flavor name");
      return;
    }

    if (flavors.some(f => f.name.toLowerCase() === newFlavorName.trim().toLowerCase())) {
      toast.error("This flavor already exists");
      return;
    }

    const newFlavor = {
      id: `temp-${Date.now()}`,
      name: newFlavorName.trim()
    };

    setFlavors([...flavors, newFlavor]);
    setFlavorIngredients({ ...flavorIngredients, [newFlavor.id]: [] });
    setNewFlavorName("");
    setShowAddFlavor(false);
    toast.success("Flavor added");
  };

  const handleRemoveFlavor = (flavorId) => {
    setFlavors(flavors.filter(f => f.id !== flavorId));
    const newFlavorIngredients = { ...flavorIngredients };
    delete newFlavorIngredients[flavorId];
    setFlavorIngredients(newFlavorIngredients);
    toast.success("Flavor removed");
  };

  // Ingredient Management per Flavor
  const handleAddIngredientToFlavor = (flavorId, ingredientId, quantity) => {
    if (!ingredientId || !quantity || parseFloat(quantity) <= 0) {
      toast.error("Please select ingredient and enter valid quantity");
      return;
    }

    const ingredient = availableIngredients.find(i => i.id === ingredientId);
    if (!ingredient) return;

    const flavorIngs = flavorIngredients[flavorId] || [];

    if (flavorIngs.some(i => i.inventory_item_id === ingredientId)) {
      toast.error("This ingredient is already added to this flavor");
      return;
    }

    const newIngredient = {
      inventory_item_id: ingredientId,
      quantity_per_item: parseFloat(quantity),
      inventory_items: ingredient
    };

    setFlavorIngredients({
      ...flavorIngredients,
      [flavorId]: [...flavorIngs, newIngredient]
    });

    toast.success("Ingredient added to flavor");
  };

  const handleRemoveIngredientFromFlavor = (flavorId, ingredientId) => {
    const flavorIngs = flavorIngredients[flavorId] || [];
    setFlavorIngredients({
      ...flavorIngredients,
      [flavorId]: flavorIngs.filter(i => i.inventory_item_id !== ingredientId)
    });
    toast.success("Ingredient removed");
  };

  // Quantity Controls
  const incrementQuantity = () => {
    setFormData({ ...formData, quantity: formData.quantity + 1 });
  };

  const decrementQuantity = () => {
    if (formData.quantity > 1) {
      setFormData({ ...formData, quantity: formData.quantity - 1 });
    }
  };

  // Validation
  const validateStock = () => {
    for (const flavorId in flavorIngredients) {
      const ingredients = flavorIngredients[flavorId];
      for (const ing of ingredients) {
        const totalRequired = parseFloat(ing.quantity_per_item) * formData.quantity;

        if (totalRequired > ing.inventory_items.current_stock) {
          const flavor = flavors.find(f => f.id === flavorId);
          toast.error(
            `Insufficient stock for ${ing.inventory_items.name} in ${flavor?.name}. Required: ${totalRequired} ${ing.inventory_items.units?.abbreviation}, Available: ${ing.inventory_items.current_stock} ${ing.inventory_items.units?.abbreviation}`
          );
          return false;
        }
      }
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      quantity: 1,
    });
    setFlavors([]);
    setFlavorIngredients({});
    setNewFlavorName("");
    setShowAddFlavor(false);
    setActiveTab("basic");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a product name");
      return;
    }

    if (!formData.quantity || formData.quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    // Flavors are now optional
    // Ingredients are now optional

    // Validate stock only if there are ingredients
    let hasIngredients = false;
    for (const flavor of flavors) {
      const ingredients = flavorIngredients[flavor.id] || [];
      if (ingredients.length > 0) {
        hasIngredients = true;
        break;
      }
    }

    if (hasIngredients && !validateStock()) {
      return;
    }

    setSubmitting(true);

    const result = await onSubmit({
      ...formData,
      flavors: flavors.map(f => ({
        name: f.name,
        ingredients: (flavorIngredients[f.id] || []).map(ing => ({
          inventory_item_id: ing.inventory_item_id,
          quantity_per_item: ing.quantity_per_item
        }))
      }))
    });

    setSubmitting(false);

    // Reset form if submission was successful
    if (result !== false && !initialData) {
      resetForm();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("basic")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "basic"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Basic Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("flavors")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "flavors"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Flavors & Ingredients ({flavors.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "basic" && (
          <div className="space-y-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                placeholder="e.g., Large Pizza"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white resize-none"
                placeholder="Brief description..."
              />
            </div>

            {/* Quantity Counter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity in Deal *
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={decrementQuantity}
                  disabled={formData.quantity <= 1}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-20 text-center px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={incrementQuantity}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Number of this product in the deal (ingredients will be multiplied by this)
              </p>
            </div>
          </div>
        )}

        {activeTab === "flavors" && (
          <div className="space-y-6">
            {/* Add Flavor Button */}
            {!showAddFlavor && (
              <button
                type="button"
                onClick={() => setShowAddFlavor(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add Flavor</span>
              </button>
            )}

            {/* Add Flavor Form */}
            {showAddFlavor && (
              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex gap-2">
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
                    placeholder="Flavor name (e.g., Chocolate)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddFlavor}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddFlavor(false);
                      setNewFlavorName("");
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Flavors List */}
            {flavors.length > 0 ? (
              <div className="space-y-4">
                {flavors.map((flavor) => (
                  <FlavorIngredientManager
                    key={flavor.id}
                    flavor={flavor}
                    ingredients={flavorIngredients[flavor.id] || []}
                    availableIngredients={availableIngredients}
                    productQuantity={formData.quantity}
                    onAddIngredient={(ingredientId, quantity) =>
                      handleAddIngredientToFlavor(flavor.id, ingredientId, quantity)
                    }
                    onRemoveIngredient={(ingredientId) =>
                      handleRemoveIngredientFromFlavor(flavor.id, ingredientId)
                    }
                    onRemoveFlavor={() => handleRemoveFlavor(flavor.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No flavors added yet
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>{initialData ? "Update Product" : "Add Product"}</>
          )}
        </button>
      </div>
    </form>
  );
}

// Flavor Ingredient Manager Component
function FlavorIngredientManager({
  flavor,
  ingredients,
  availableIngredients,
  productQuantity,
  onAddIngredient,
  onRemoveIngredient,
  onRemoveFlavor
}) {
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [ingredientQuantity, setIngredientQuantity] = useState("");

  const handleAdd = () => {
    onAddIngredient(selectedIngredient, ingredientQuantity);
    setSelectedIngredient("");
    setIngredientQuantity("");
    setShowAddIngredient(false);
  };

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{flavor.name}</h3>
        <button
          type="button"
          onClick={onRemoveFlavor}
          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Add Ingredient Button */}
      {!showAddIngredient && (
        <button
          type="button"
          onClick={() => setShowAddIngredient(true)}
          className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
        >
          <Plus className="w-4 h-4" />
          <span>Add Ingredient</span>
        </button>
      )}

      {/* Add Ingredient Form */}
      {showAddIngredient && (
        <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-200 dark:border-green-800 mb-3">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select
              value={selectedIngredient}
              onChange={(e) => setSelectedIngredient(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
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
              className="px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddIngredient(false);
                setSelectedIngredient("");
                setIngredientQuantity("");
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Ingredients Table */}
      {ingredients.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
                  Ingredient
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
                  Qty/Item
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
                  Total
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
                  Stock
                </th>
                <th className="text-center py-2 px-2 font-medium text-gray-700 dark:text-gray-300 w-12">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {ingredients.map((ingredient) => {
                const totalRequired = ingredient.quantity_per_item * productQuantity;
                const isInsufficient = totalRequired > ingredient.inventory_items.current_stock;

                return (
                  <tr key={ingredient.inventory_item_id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="py-2 px-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {ingredient.inventory_items.name}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-gray-700 dark:text-gray-300">
                        {ingredient.quantity_per_item} {ingredient.inventory_items.units?.abbreviation}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`font-semibold ${
                          isInsufficient
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {totalRequired.toFixed(2)} {ingredient.inventory_items.units?.abbreviation}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`font-medium ${
                          isInsufficient
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {ingredient.inventory_items.current_stock} {ingredient.inventory_items.units?.abbreviation}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveIngredient(ingredient.inventory_item_id)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-4 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No ingredients added yet
          </p>
        </div>
      )}
    </div>
  );
}
