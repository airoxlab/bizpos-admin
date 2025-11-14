// // components/forms/DealProductForm.js
// "use client";
// import { useState, useEffect } from "react";
// import { Plus, Trash2, Droplet, X, Minus } from "lucide-react";
// import toast from "react-hot-toast";
// import { supabase } from "@/lib/supabase";

// export default function DealProductForm({ onSubmit, onCancel, initialData, dealCategoryId }) {
//   const [activeTab, setActiveTab] = useState("basic");
//   const [formData, setFormData] = useState({
//     name: "",
//     quantity: 1,
//   });
//   const [uploading, setUploading] = useState(false);
//   const [availableIngredients, setAvailableIngredients] = useState([]);
//   const [selectedIngredients, setSelectedIngredients] = useState([]);
//   const [selectedFlavors, setSelectedFlavors] = useState([]);
//   const [newFlavor, setNewFlavor] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [showAddIngredient, setShowAddIngredient] = useState(false);
//   const [newIngredient, setNewIngredient] = useState({
//     ingredient_id: "",
//     quantity: "",
//   });

//   useEffect(() => {
//     loadIngredients();
//   }, []);

//   useEffect(() => {
//     if (initialData) {
//       setFormData({
//         name: initialData.name || "",
//         quantity: initialData.quantity || 1,
//       });
//       setSelectedIngredients(
//         initialData.deal_product_ingredients?.map((i) => ({
//           ingredient_id: i.ingredient_id,
//           quantity: i.quantity,
//           inventory_items: i.inventory_items,
//         })) || []
//       );
//       setSelectedFlavors(
//         initialData.deal_product_flavors?.map((f) => f.flavor) || []
//       );
//     }
//   }, [initialData]);

//   const loadIngredients = async () => {
//     try {
//       const { data, error } = await supabase
//         .from("inventory_items")
//         .select(`
//           id,
//           name,
//           current_stock,
//           unit_id,
//           units (
//             id,
//             name,
//             abbreviation
//           )
//         `)
//         .order("name");

//       if (error) {
//         console.error("Supabase error:", error);
//         throw error;
//       }

//       console.log("Loaded ingredients:", data);
//       setAvailableIngredients(data || []);

//       if (!data || data.length === 0) {
//         toast.info("No inventory items found. Please add items to your inventory first.");
//       }
//     } catch (error) {
//       console.error("Error loading ingredients:", error);
//       toast.error("Failed to load ingredients: " + (error.message || "Unknown error"));
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleAddIngredient = () => {
//     if (!newIngredient.ingredient_id || !newIngredient.quantity || parseFloat(newIngredient.quantity) <= 0) {
//       toast.error("Please select ingredient and enter quantity");
//       return;
//     }

//     const ingredient = availableIngredients.find((i) => i.id === newIngredient.ingredient_id);
//     if (!ingredient) return;

//     // Check if ingredient already exists
//     if (selectedIngredients.some((i) => i.ingredient_id === newIngredient.ingredient_id)) {
//       toast.error("This ingredient is already added");
//       return;
//     }

//     setSelectedIngredients([
//       ...selectedIngredients,
//       {
//         ingredient_id: newIngredient.ingredient_id,
//         quantity: parseFloat(newIngredient.quantity),
//         inventory_items: ingredient,
//       },
//     ]);

//     setNewIngredient({ ingredient_id: "", quantity: "" });
//     setShowAddIngredient(false);
//   };

//   const handleRemoveIngredient = (ingredientId) => {
//     setSelectedIngredients(selectedIngredients.filter((i) => i.ingredient_id !== ingredientId));
//   };

//   const handleAddFlavor = () => {
//     if (newFlavor.trim() && !selectedFlavors.includes(newFlavor.trim())) {
//       setSelectedFlavors([...selectedFlavors, newFlavor.trim()]);
//       setNewFlavor("");
//     }
//   };

//   const handleRemoveFlavor = (flavor) => {
//     setSelectedFlavors(selectedFlavors.filter((f) => f !== flavor));
//   };

//   const incrementQuantity = () => {
//     setFormData({ ...formData, quantity: formData.quantity + 1 });
//   };

//   const decrementQuantity = () => {
//     if (formData.quantity > 1) {
//       setFormData({ ...formData, quantity: formData.quantity - 1 });
//     }
//   };

//   const validateIngredients = () => {
//     for (let ing of selectedIngredients) {
//       const totalRequired = parseFloat(ing.quantity) * parseFloat(formData.quantity);

//       if (totalRequired > ing.inventory_items.current_stock) {
//         toast.error(
//           `Insufficient stock for ${ing.inventory_items.name}. Required: ${totalRequired} ${ing.inventory_items.units?.abbreviation}, Available: ${ing.inventory_items.current_stock} ${ing.inventory_items.units?.abbreviation}`
//         );
//         return false;
//       }
//     }
//     return true;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!formData.name.trim()) {
//       toast.error("Please enter a product name");
//       return;
//     }

//     if (!formData.quantity || formData.quantity <= 0) {
//       toast.error("Please enter a valid quantity");
//       return;
//     }

//     // Validate ingredients stock
//     if (!validateIngredients()) {
//       return;
//     }

//     setUploading(true);

//     const validIngredients = selectedIngredients.map((ing) => ({
//       ingredient_id: ing.ingredient_id,
//       quantity: ing.quantity,
//     }));

//     await onSubmit({
//       ...formData,
//       ingredients: validIngredients,
//       flavors: selectedFlavors,
//       deal_category_id: dealCategoryId,
//     });

//     setUploading(false);
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center py-12">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
//       </div>
//     );
//   }

//   return (
//     <form onSubmit={handleSubmit} className="flex flex-col h-full">
//       {/* Tabs */}
//       <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
//         <button
//           type="button"
//           onClick={() => setActiveTab("basic")}
//           className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
//             activeTab === "basic"
//               ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
//               : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
//           }`}
//         >
//           Basic Info & Variants
//         </button>
//         <button
//           type="button"
//           onClick={() => setActiveTab("ingredients")}
//           className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
//             activeTab === "ingredients"
//               ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
//               : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
//           }`}
//         >
//           Ingredients ({selectedIngredients.length})
//         </button>
//       </div>

//       {/* Tab Content */}
//       <div className="flex-1 overflow-y-auto">
//         {activeTab === "basic" && (
//           <div className="space-y-6">
//             {/* Product Name */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//                 Product Name *
//               </label>
//               <input
//                 type="text"
//                 value={formData.name}
//                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//                 className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
//                 placeholder="e.g., Large Pizza"
//                 required
//               />
//             </div>

//             {/* Quantity Counter */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//                 Quantity in Deal *
//               </label>
//               <div className="flex items-center gap-3">
//                 <button
//                   type="button"
//                   onClick={decrementQuantity}
//                   disabled={formData.quantity <= 1}
//                   className="w-10 h-10 flex items-center justify-center border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <Minus className="w-4 h-4" />
//                 </button>
//                 <input
//                   type="number"
//                   min="1"
//                   value={formData.quantity}
//                   onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
//                   className="w-20 text-center px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
//                 />
//                 <button
//                   type="button"
//                   onClick={incrementQuantity}
//                   className="w-10 h-10 flex items-center justify-center border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
//                 >
//                   <Plus className="w-4 h-4" />
//                 </button>
//               </div>
//               <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
//                 Number of this product in the deal (ingredients will be multiplied by this)
//               </p>
//             </div>

//             {/* Flavors Section */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
//                 Flavors (Optional)
//               </label>

//               <div className="flex gap-2 mb-3">
//                 <div className="flex-1 relative">
//                   <Droplet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//                   <input
//                     type="text"
//                     value={newFlavor}
//                     onChange={(e) => setNewFlavor(e.target.value)}
//                     onKeyDown={(e) => {
//                       if (e.key === "Enter") {
//                         e.preventDefault();
//                         handleAddFlavor();
//                       }
//                     }}
//                     placeholder="e.g., Chocolate, Vanilla"
//                     className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
//                   />
//                 </div>
//                 <button
//                   type="button"
//                   onClick={handleAddFlavor}
//                   className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
//                 >
//                   <Plus className="w-4 h-4" />
//                 </button>
//               </div>

//               {selectedFlavors.length > 0 ? (
//                 <div className="flex flex-wrap gap-2">
//                   {selectedFlavors.map((flavor, index) => (
//                     <div
//                       key={index}
//                       className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full"
//                     >
//                       <span className="text-sm">{flavor}</span>
//                       <button
//                         type="button"
//                         onClick={() => handleRemoveFlavor(flavor)}
//                         className="hover:text-red-600"
//                       >
//                         <X className="w-3 h-3" />
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="text-center py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
//                   <p className="text-sm text-gray-500 dark:text-gray-400">
//                     No flavors added yet
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {activeTab === "ingredients" && (
//           <div className="space-y-4">
//             {/* Add Ingredient Button */}
//             {!showAddIngredient && (
//               <button
//                 type="button"
//                 onClick={() => setShowAddIngredient(true)}
//                 className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
//               >
//                 <Plus className="w-5 h-5" />
//                 <span className="font-medium">New Ingredient</span>
//               </button>
//             )}

//             {/* Add Ingredient Form */}
//             {showAddIngredient && (
//               <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200 dark:border-green-800">
//                 <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
//                   New Ingredient
//                 </h4>

//                 <div className="space-y-3">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//                       Inventory Item *
//                     </label>
//                     <select
//                       value={newIngredient.ingredient_id}
//                       onChange={(e) =>
//                         setNewIngredient({ ...newIngredient, ingredient_id: e.target.value })
//                       }
//                       className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
//                     >
//                       <option value="">Select ingredient</option>
//                       {availableIngredients.map((item) => (
//                         <option key={item.id} value={item.id}>
//                           {item.name} (Stock: {item.current_stock} {item.units?.abbreviation})
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//                         Quantity per serving *
//                       </label>
//                       <input
//                         type="number"
//                         step="0.01"
//                         value={newIngredient.quantity}
//                         onChange={(e) =>
//                           setNewIngredient({ ...newIngredient, quantity: e.target.value })
//                         }
//                         placeholder="0.000"
//                         className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//                         Unit *
//                       </label>
//                       <input
//                         type="text"
//                         value={
//                           newIngredient.ingredient_id
//                             ? availableIngredients.find((i) => i.id === newIngredient.ingredient_id)
//                                 ?.units?.abbreviation || "Select item first"
//                             : "Select item first"
//                         }
//                         disabled
//                         className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400"
//                       />
//                     </div>
//                   </div>

//                   <div className="flex gap-2 pt-2">
//                     <button
//                       type="button"
//                       onClick={handleAddIngredient}
//                       className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
//                     >
//                       Save Ingredient
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => {
//                         setShowAddIngredient(false);
//                         setNewIngredient({ ingredient_id: "", quantity: "" });
//                       }}
//                       className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Ingredients Table */}
//             {selectedIngredients.length > 0 && (
//               <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg">
//                 <table className="w-full text-sm">
//                   <thead className="bg-gray-50 dark:bg-slate-800">
//                     <tr>
//                       <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
//                         Ingredient
//                       </th>
//                       <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
//                         Qty/Unit
//                       </th>
//                       <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
//                         Total Required
//                       </th>
//                       <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
//                         Available
//                       </th>
//                       <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 w-20">
//                         Action
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
//                     {selectedIngredients.map((ingredient) => {
//                       const totalRequired = ingredient.quantity * formData.quantity;
//                       const isInsufficient = totalRequired > ingredient.inventory_items.current_stock;

//                       return (
//                         <tr key={ingredient.ingredient_id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
//                           <td className="py-3 px-4">
//                             <span className="font-medium text-gray-900 dark:text-white">
//                               {ingredient.inventory_items.name}
//                             </span>
//                           </td>
//                           <td className="py-3 px-4">
//                             <span className="text-gray-700 dark:text-gray-300">
//                               {ingredient.quantity} {ingredient.inventory_items.units?.abbreviation}
//                             </span>
//                           </td>
//                           <td className="py-3 px-4">
//                             <span
//                               className={`font-semibold ${
//                                 isInsufficient
//                                   ? "text-red-600 dark:text-red-400"
//                                   : "text-gray-900 dark:text-white"
//                               }`}
//                             >
//                               {totalRequired.toFixed(2)} {ingredient.inventory_items.units?.abbreviation}
//                             </span>
//                           </td>
//                           <td className="py-3 px-4">
//                             <span
//                               className={`font-medium ${
//                                 isInsufficient
//                                   ? "text-red-600 dark:text-red-400"
//                                   : "text-green-600 dark:text-green-400"
//                               }`}
//                             >
//                               {ingredient.inventory_items.current_stock}{" "}
//                               {ingredient.inventory_items.units?.abbreviation}
//                             </span>
//                           </td>
//                           <td className="py-3 px-4 text-center">
//                             <button
//                               type="button"
//                               onClick={() => handleRemoveIngredient(ingredient.ingredient_id)}
//                               className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
//                             >
//                               <Trash2 className="w-4 h-4" />
//                             </button>
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}

//             {selectedIngredients.length === 0 && !showAddIngredient && (
//               <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
//                 <p className="text-sm text-gray-500 dark:text-gray-400">
//                   No ingredients added yet
//                 </p>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Action Buttons */}
//       <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-slate-700">
//         <button
//           type="button"
//           onClick={onCancel}
//           disabled={uploading}
//           className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
//         >
//           Cancel
//         </button>
//         <button
//           type="submit"
//           disabled={uploading}
//           className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//         >
//           {uploading ? (
//             <>
//               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
//               Saving...
//             </>
//           ) : (
//             <>{initialData ? "Update Product" : "Add Product"}</>
//           )}
//         </button>
//       </div>
//     </form>
//   );
// }