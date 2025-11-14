// components/forms/ProductForm.js - COMPLETE with Fixed Unit Display
"use client";
import { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  X, 
  Save,
  DollarSign,
  Package,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Scale,
  AlertTriangle,
  ChevronDown,
  Info
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

export default function ProductForm({ 
  product = null, 
  category,
  onSave,
  isLoading = false 
}) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    base_price: '',
    discount_percentage: '',
    tax_rate: ''
  });
  
  const [variants, setVariants] = useState([{ name: '', price: '' }]);
  const [selectedVariantForIngredients, setSelectedVariantForIngredients] = useState(null);
  const [variantIngredients, setVariantIngredients] = useState({});
  const [deletedIngredientIds, setDeletedIngredientIds] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const fileInputRef = useRef(null);

  // Unit compatibility groups - units that can be converted between each other
  const unitGroups = {
    'weight': ['g', 'kg'],
    'volume': ['ml', 'l', 'L'],
    'quantity': ['pcs', 'dz', 'pc', 'dozen']
  };

  useEffect(() => {
    fetchInventoryItems();
    fetchUnits();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        image_url: product.image_url || '',
        base_price: product.base_price || '',
        discount_percentage: product.discount_percentage || '',
        tax_rate: product.tax_rate || ''
      });
      
      const productVariants = product.variants?.length > 0 ? product.variants : [{ name: '', price: '' }];
      setVariants(productVariants);
      setImagePreview(product.image_url || '');
      
      if (product.id) {
        fetchVariantIngredients(product.id, productVariants);
      }
    } else {
      resetForm();
    }
  }, [product]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      base_price: '',
      discount_percentage: '',
      tax_rate: ''
    });
    setVariants([{ name: '', price: '' }]);
    setVariantIngredients({});
    setSelectedVariantForIngredients(null);
    setDeletedIngredientIds([]);
    setImagePreview('');
    setImageFile(null);
    setEditingIngredient(null);
    setActiveTab('basic');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          id,
          name,
          current_stock,
          unit_id,
          units (id, name, abbreviation)
        `)
        .order('name');

      if (error) throw error;
      
      console.log('Fetched inventory items with units:', data);
      setInventoryItems(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Error loading inventory items');
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Error loading units');
    }
  };

  const fetchVariantIngredients = async (productId, productVariants) => {
    setLoadingIngredients(true);
    try {
      const { data, error } = await supabase
        .from('product_variant_ingredients')
        .select(`
          id,
          product_id,
          variant_id,
          inventory_item_id,
          quantity,
          unit_id,
          inventory_items (
            id,
            name,
            current_stock,
            unit_id,
            units (id, name, abbreviation)
          ),
          units (id, name, abbreviation)
        `)
        .eq('product_id', productId);

      if (error) throw error;

      // Group ingredients by variant
      const grouped = {};
      
      if (data && data.length > 0) {
        data.forEach(ing => {
          const key = ing.variant_id || 'base';
          if (!grouped[key]) grouped[key] = [];
          
          grouped[key].push({
            id: ing.id,
            inventory_item_id: ing.inventory_item_id,
            quantity: ing.quantity,
            unit_id: ing.unit_id,
            item_name: ing.inventory_items?.name || 'Unknown Item',
            unit_abbr: ing.units?.abbreviation || 'N/A',
            inventory_unit_abbr: ing.inventory_items?.units?.abbreviation || 'N/A',
            isExisting: true
          });
        });
      }
      
      setVariantIngredients(grouped);
      
      // Set first variant/base as selected
      if (productVariants.length > 0 && productVariants[0].id) {
        setSelectedVariantForIngredients(productVariants[0].id);
      } else {
        setSelectedVariantForIngredients('base');
      }
      
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      toast.error('Error loading ingredients');
    } finally {
      setLoadingIngredients(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setImageFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    await uploadImageToSupabase(file);
  };

  const uploadImageToSupabase = async (file) => {
    setUploadingImage(true);
    const uploadToast = toast.loading('Uploading image...');
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      
      toast.success('Image uploaded successfully!', { id: uploadToast });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image: ' + error.message, { id: uploadToast });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Image removed');
  };

  const addVariant = () => {
    setVariants([...variants, { name: '', price: '' }]);
  };

  const removeVariant = (index) => {
    if (variants.length > 1) {
      const variantToRemove = variants[index];
      
      // Remove ingredients for this variant
      if (variantToRemove.id) {
        setVariantIngredients(prev => {
          const newIngredients = { ...prev };
          delete newIngredients[variantToRemove.id];
          return newIngredients;
        });
      }
      
      setVariants(variants.filter((_, i) => i !== index));
      toast.success('Variant removed');
    }
  };

  const updateVariant = (index, field, value) => {
    const updatedVariants = variants.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    );
    setVariants(updatedVariants);
  };

  // Get compatible units for selected inventory item
  const getCompatibleUnits = (inventoryItemId) => {
    if (!inventoryItemId) return [];
    
    const selectedItem = inventoryItems.find(i => i.id === inventoryItemId);
    if (!selectedItem || !selectedItem.units?.abbreviation) return units;
    
    const inventoryUnitAbbr = selectedItem.units.abbreviation;
    
    // Find which group this unit belongs to
    let compatibleGroup = null;
    for (const [groupName, groupUnits] of Object.entries(unitGroups)) {
      if (groupUnits.includes(inventoryUnitAbbr)) {
        compatibleGroup = groupUnits;
        break;
      }
    }
    
    // If no compatible group found, return only the exact unit
    if (!compatibleGroup) {
      return units.filter(u => u.abbreviation === inventoryUnitAbbr);
    }
    
    // Return units that are in the compatible group
    return units.filter(u => compatibleGroup.includes(u.abbreviation));
  };

  const getCurrentIngredients = () => {
    if (!selectedVariantForIngredients) return [];
    return variantIngredients[selectedVariantForIngredients] || [];
  };

  const addIngredient = () => {
    if (!selectedVariantForIngredients) {
      toast.error('Please select a variant first');
      return;
    }
    
    setEditingIngredient({ 
      id: null, 
      inventory_item_id: '', 
      quantity: '', 
      unit_id: '',
      isExisting: false
    });
  };

  const saveIngredient = () => {
    if (!editingIngredient.inventory_item_id || !editingIngredient.quantity || !editingIngredient.unit_id) {
      toast.error('Please fill in all ingredient fields');
      return;
    }

    if (parseFloat(editingIngredient.quantity) <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    const selectedItem = inventoryItems.find(i => i.id === editingIngredient.inventory_item_id);
    const selectedUnit = units.find(u => u.id === editingIngredient.unit_id);

    const variantKey = selectedVariantForIngredients;
    const currentVariantIngredients = variantIngredients[variantKey] || [];

    if (editingIngredient.id && editingIngredient.isExisting) {
      // Update existing ingredient
      const updated = currentVariantIngredients.map(ing => 
        ing.id === editingIngredient.id 
          ? { 
              ...editingIngredient, 
              item_name: selectedItem?.name, 
              unit_abbr: selectedUnit?.abbreviation,
              inventory_unit_abbr: selectedItem?.units?.abbreviation,
              isExisting: true
            }
          : ing
      );
      setVariantIngredients(prev => ({ ...prev, [variantKey]: updated }));
      toast.success('Ingredient updated');
    } else if (editingIngredient.id && !editingIngredient.isExisting) {
      // Update temp ingredient
      const updated = currentVariantIngredients.map(ing => 
        ing.id === editingIngredient.id 
          ? { 
              ...editingIngredient, 
              item_name: selectedItem?.name, 
              unit_abbr: selectedUnit?.abbreviation,
              inventory_unit_abbr: selectedItem?.units?.abbreviation,
              isExisting: false
            }
          : ing
      );
      setVariantIngredients(prev => ({ ...prev, [variantKey]: updated }));
      toast.success('Ingredient updated');
    } else {
      // Add new ingredient
      const newIngredient = { 
        ...editingIngredient, 
        id: `temp_${Date.now()}`,
        item_name: selectedItem?.name,
        unit_abbr: selectedUnit?.abbreviation,
        inventory_unit_abbr: selectedItem?.units?.abbreviation,
        isExisting: false
      };
      setVariantIngredients(prev => ({
        ...prev,
        [variantKey]: [...currentVariantIngredients, newIngredient]
      }));
      toast.success('Ingredient added');
    }
    setEditingIngredient(null);
  };

  const deleteIngredient = (ingredientToDelete) => {
    toast((t) => (
      <div className="flex flex-col space-y-3">
        <p className="font-medium text-gray-900 dark:text-white">
          Delete {ingredientToDelete.item_name}?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (ingredientToDelete.isExisting && ingredientToDelete.id && !ingredientToDelete.id.toString().startsWith('temp_')) {
                setDeletedIngredientIds(prev => [...prev, ingredientToDelete.id]);
              }
              
              const variantKey = selectedVariantForIngredients;
              const currentIngredients = variantIngredients[variantKey] || [];
              const updated = currentIngredients.filter(ing => ing.id !== ingredientToDelete.id);
              
              setVariantIngredients(prev => ({
                ...prev,
                [variantKey]: updated
              }));
              
              toast.success('Ingredient removed', { id: t.id });
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 10000,
      position: 'top-center',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validVariants = variants.filter(v => v.name && v.price && parseFloat(v.price) > 0);
    
    // Create a mapping of current variant keys to their index or id
    const variantKeyMap = {};
    validVariants.forEach((variant, index) => {
      const key = variant.id || `variant_${index}`;
      variantKeyMap[key] = {
        index,
        id: variant.id,
        name: variant.name,
        price: variant.price
      };
    });
    
    console.log('🔑 Variant Key Map:', variantKeyMap);
    console.log('🥘 Variant Ingredients:', variantIngredients);
    
    // Prepare all ingredients with variant association
    const allIngredients = [];
    Object.keys(variantIngredients).forEach(variantKey => {
      const ingredients = variantIngredients[variantKey] || [];
      ingredients.forEach(ing => {
        if (ing.inventory_item_id && ing.quantity && parseFloat(ing.quantity) > 0 && ing.unit_id) {
          // Clean up the ingredient data
          const cleanIngredient = {
            id: ing.id,
            inventory_item_id: ing.inventory_item_id,
            quantity: parseFloat(ing.quantity),
            unit_id: ing.unit_id,
            variant_key: variantKey, // 'base', 'variant_0', or actual variant.id
            isExisting: ing.isExisting || false
          };
          
          allIngredients.push(cleanIngredient);
        }
      });
    });
    
    console.log('📦 Payload ingredients:', allIngredients);
    
    const payload = { 
      ...formData,
      base_price: parseFloat(formData.base_price) || 0,
      discount_percentage: parseFloat(formData.discount_percentage) || 0,
      tax_rate: parseFloat(formData.tax_rate) || 0,
      variants: validVariants,
      ingredients: allIngredients,
      deletedIngredientIds: deletedIngredientIds,
      category_id: category?.id,
      variantKeyMap // Add this for backend reference
    };
    
    console.log('🚀 Submitting payload:', payload);
    
    const success = await onSave(payload);
    
    if (success !== false) {
      resetForm();
    }
  };

  const getAvailableStock = (inventoryItemId) => {
    const item = inventoryItems.find(i => i.id === inventoryItemId);
    return item ? `${item.current_stock} ${item.units?.abbreviation || ''}` : 'N/A';
  };

  const getVariantOptions = () => {
    const options = [];
    
    // Add base product option if no variants or user wants base ingredients
    if (variants.length === 1 && !variants[0].name) {
      options.push({ key: 'base', label: 'Base Product (No Variants)' });
    }
    
    // Add valid variants
    variants.forEach((variant, index) => {
      if (variant.name && variant.price) {
        const key = variant.id || `variant_${index}`;
        options.push({ 
          key, 
          label: `${variant.name} - PKR ${variant.price}` 
        });
      }
    });
    
    return options;
  };

  const getUnitGroupInfo = (unitAbbr) => {
    for (const [groupName, groupUnits] of Object.entries(unitGroups)) {
      if (groupUnits.includes(unitAbbr)) {
        return { group: groupName, units: groupUnits };
      }
    }
    return null;
  };

  const currentIngredients = getCurrentIngredients();
  const variantOptions = getVariantOptions();
  const compatibleUnits = editingIngredient?.inventory_item_id 
    ? getCompatibleUnits(editingIngredient.inventory_item_id)
    : [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-gray-200 dark:border-slate-700 px-6">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'basic'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Basic Info & Variants
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ingredients')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'ingredients'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Ingredients ({Object.values(variantIngredients).flat().length})
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Product Image
                </label>
                
                <div className="relative w-full h-48 bg-gray-100 dark:bg-slate-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No image selected</p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </span>
                </button>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Basic Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description"
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Pricing & Tax
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Price (PKR) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Discount (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                    <Tag className="w-5 h-5 mr-2" />
                    Product Variants
                  </h3>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Variant</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          placeholder="Variant name (e.g., Small, Medium, Large)"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, 'price', e.target.value)}
                          placeholder="Price (PKR)"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ingredients' && (
            <div className="space-y-6">
              {variantOptions.length === 0 ? (
                <div className="text-center py-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                  <p className="text-amber-900 dark:text-amber-100 font-medium">Please add variants first</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Go to "Basic Info & Variants" tab to add product variants
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Scale className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-blue-900 dark:text-blue-100">Variant-Based Ingredients</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Each variant can have different ingredient quantities. Select a variant and add its specific ingredients.
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                          ✨ Smart Unit Selection: Only compatible units will be shown based on your inventory item's unit!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Variant to Add Ingredients
                    </label>
                    <div className="relative">
                      <select
                        value={selectedVariantForIngredients || ''}
                        onChange={(e) => setSelectedVariantForIngredients(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 appearance-none pr-10"
                      >
                        <option value="">-- Select a variant --</option>
                        {variantOptions.map(option => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {selectedVariantForIngredients && (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            <Scale className="w-5 h-5" />
                            Ingredients for {variantOptions.find(v => v.key === selectedVariantForIngredients)?.label}
                          </h3>
                          {!editingIngredient && (
                            <button
                              type="button"
                              onClick={addIngredient}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add Ingredient</span>
                            </button>
                          )}
                        </div>

                        {editingIngredient && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                              {editingIngredient.isExisting ? 'Edit Ingredient' : 'New Ingredient'}
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Inventory Item *
                                </label>
                                <select
                                  value={editingIngredient.inventory_item_id}
                                  onChange={(e) => {
                                    const selectedItem = inventoryItems.find(i => i.id === e.target.value);
                                    setEditingIngredient({ 
                                      ...editingIngredient, 
                                      inventory_item_id: e.target.value,
                                      unit_id: selectedItem?.unit_id || '' // Auto-select the inventory item's unit
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="">Select ingredient</option>
                                  {inventoryItems.map(item => {
                                    const outOfStock = item.current_stock <= 0;
                                    const unitInfo = getUnitGroupInfo(item.units?.abbreviation);
                                    const unitDisplay = item.units?.abbreviation || 'no unit';
                                    return (
                                      <option key={item.id} value={item.id} disabled={outOfStock}>
                                        {item.name} - {item.current_stock} {unitDisplay}
                                        {unitInfo && ` [${unitInfo.group}]`}
                                        {outOfStock && ' - ⚠️ OUT OF STOCK'}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Quantity per serving *
                                  </label>
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={editingIngredient.quantity}
                                    onChange={(e) => setEditingIngredient({ ...editingIngredient, quantity: e.target.value })}
                                    placeholder="0.000"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Unit * {compatibleUnits.length > 0 && `(${compatibleUnits.length} compatible)`}
                                  </label>
                                  <select
                                    value={editingIngredient.unit_id}
                                    onChange={(e) => setEditingIngredient({ ...editingIngredient, unit_id: e.target.value })}
                                    disabled={!editingIngredient.inventory_item_id}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <option value="">
                                      {!editingIngredient.inventory_item_id ? 'Select item first' : 'Select unit'}
                                    </option>
                                    {compatibleUnits.map(unit => (
                                      <option key={unit.id} value={unit.id}>
                                        {unit.name} ({unit.abbreviation})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {editingIngredient.inventory_item_id && compatibleUnits.length === 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                  <p className="text-xs text-amber-800 dark:text-amber-200">
                                    ⚠️ No compatible units found. Please add compatible units to your system.
                                  </p>
                                </div>
                              )}

                              {editingIngredient.inventory_item_id && compatibleUnits.length > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                  <p className="text-xs text-blue-800 dark:text-blue-200">
                                    ℹ️ Showing only compatible units for {inventoryItems.find(i => i.id === editingIngredient.inventory_item_id)?.units?.abbreviation} measurement
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                              <button
                                type="button"
                                onClick={saveIngredient}
                                disabled={!editingIngredient.inventory_item_id || !editingIngredient.quantity || !editingIngredient.unit_id}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                Save Ingredient
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingIngredient(null)}
                                className="px-4 py-2 bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {loadingIngredients ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading ingredients...</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {currentIngredients.length === 0 ? (
                              <div className="text-center py-8 bg-gray-50 dark:bg-slate-700 rounded-lg">
                                <Scale className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No ingredients added for this variant</p>
                              </div>
                            ) : (
                              currentIngredients.map((ingredient) => (
                                <div key={ingredient.id} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900 dark:text-white">{ingredient.item_name}</h4>
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Quantity: <span className="font-semibold">{ingredient.quantity} {ingredient.unit_abbr}</span> per serving
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                        Available: {getAvailableStock(ingredient.inventory_item_id)} • Inventory Unit: {ingredient.inventory_unit_abbr}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setEditingIngredient(ingredient)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteIngredient(ingredient)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <button
            type="submit"
            disabled={isLoading || uploadingImage}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}