// app/admin/products/catalog/page.js - Fixed Version
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import RightSidebar from "@/components/ui/RightSidebar";
import ProductForm from "@/components/forms/ProductForm";
import CategoryForm from "@/components/forms/CategoryForm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  Plus,
  Edit2,
  Package,
  Image as ImageIcon,
  Search,
  Grid3X3,
  List,
  ChevronDown,
  Menu as MenuIcon,
  GripVertical,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Category Tab Component
function SortableCategoryTab({ category, isActive, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
        isActive
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
      }`}
      onClick={onClick}
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium whitespace-nowrap">
        {category.name}
      </span>
      <span className="text-xs opacity-75">
        ({category.products?.length || 0})
      </span>
    </div>
  );
}

export default function CatalogPage() {
  const [menus, setMenus] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  // Sidebar states
  const [showProductSidebar, setShowProductSidebar] = useState(false);
  const [showCategorySidebar, setShowCategorySidebar] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  // Confirm dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedMenu) {
      loadCategories();
    }
  }, [selectedMenu]);

  useEffect(() => {
    if (!categories.length) {
      setFilteredProducts([]);
      return;
    }

    let allProducts = [];

    if (activeCategory) {
      allProducts = activeCategory.products || [];
    } else {
      categories.forEach((category) => {
        if (category.products) {
          allProducts = [
            ...allProducts,
            ...category.products.map((p) => ({
              ...p,
              categoryName: category.name,
            })),
          ];
        }
      });
    }

    if (searchTerm) {
      allProducts = allProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.description &&
            product.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredProducts(allProducts);
  }, [categories, searchTerm, activeCategory]);

  const loadData = async () => {
    try {
      const user = await getUser();
      if (!user) return;

      const { data: menusData, error: menusError } = await supabase
        .from("menus")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });

      if (menusError) throw menusError;
      setMenus(menusData || []);

      if (menusData && menusData.length > 0 && !selectedMenu) {
        setSelectedMenu(menusData[0]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error loading menus");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!selectedMenu) return;

    setCategoriesLoading(true);
    setCategories([]);
    setActiveCategory(null);
    setFilteredProducts([]);

    try {
      const user = await getUser();
      const { data: categoriesData, error } = await supabase
        .from("categories")
        .select(
          `
          *,
          products (
            id,
            name,
            description,
            image_url,
            base_price,
            discount_percentage,
            is_active
          )
        `
        )
        .eq("user_id", user.id)
        .eq("menu_id", selectedMenu.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      setCategories(categoriesData || []);

      if (categoriesData && categoriesData.length > 0) {
        setActiveCategory(categoriesData[0]);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Error loading categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleMenuChange = (menuId) => {
    const menu = menus.find((m) => m.id === menuId);
    if (menu && menu.id !== selectedMenu?.id) {
      setSearchTerm("");
      setSelectedMenu(menu);
    }
  };

  const handleCategorySubmit = async (categoryData) => {
    try {
      const user = await getUser();
      let imageUrl = categoryData.image_url;

      if (categoryData.imageFile) {
        imageUrl = await uploadImage(categoryData.imageFile);
      }

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: categoryData.name,
            subtitle: categoryData.subtitle,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Category updated successfully");
      } else {
        const { error } = await supabase.from("categories").insert({
          user_id: user.id,
          menu_id: selectedMenu.id,
          name: categoryData.name,
          subtitle: categoryData.subtitle,
          image_url: imageUrl,
          sort_order: categories.length,
        });

        if (error) throw error;
        toast.success("Category created successfully");
      }

      setShowCategorySidebar(false);
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Error saving category");
    }
  };
// FIXED handleProductSubmit function for catalog page
// Replace your current handleProductSubmit with this

// SIMPLIFIED handleProductSubmit function - Better Logic
// Replace your current handleProductSubmit with this

const handleProductSubmit = async (productData) => {
  const saveToast = toast.loading("Saving product...");

  try {
    const user = await getUser();

    const productPayload = {
      user_id: user.id,
      category_id: activeCategory?.id || selectedCategory?.id,
      name: productData.name,
      description: productData.description,
      image_url: productData.image_url,
      base_price: parseFloat(productData.base_price) || 0,
      discount_percentage: parseFloat(productData.discount_percentage) || 0,
      tax_rate: parseFloat(productData.tax_rate) || 0,
    };

    let productId;
    const variantIdMapping = {}; // Maps temp keys to real variant IDs

    if (editingProduct) {
      // ===== UPDATE EXISTING PRODUCT =====
      console.log("📝 Updating product:", editingProduct.id);
      
      const { error } = await supabase
        .from("products")
        .update({
          ...productPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingProduct.id);

      if (error) throw error;
      productId = editingProduct.id;

      // Get existing variants
      const { data: existingVariants } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId);

      console.log("📂 Existing variants:", existingVariants);

      const existingVariantIds = (existingVariants || []).map((v) => v.id);
      const newVariantIds = [];

      // Process variants from the form
      if (productData.variants && productData.variants.length > 0) {
        for (let index = 0; index < productData.variants.length; index++) {
          const variant = productData.variants[index];
          const tempKey = variant.id || `variant_${index}`;

          if (variant.id && existingVariantIds.includes(variant.id)) {
            // UPDATE existing variant
            console.log(`✏️ Updating existing variant: ${variant.id}`);
            
            const { error: updateError } = await supabase
              .from("product_variants")
              .update({
                name: variant.name,
                price: parseFloat(variant.price),
                sort_order: index,
              })
              .eq("id", variant.id);

            if (updateError) throw updateError;

            // Map both the UUID and temp key to this variant ID
            variantIdMapping[variant.id] = variant.id;
            variantIdMapping[tempKey] = variant.id;
            newVariantIds.push(variant.id);
            
            console.log(`✅ Updated: ${variant.name} (ID: ${variant.id})`);
          } else {
            // CREATE new variant
            console.log(`➕ Creating new variant: ${variant.name}`);
            
            const { data: newVariant, error: insertError } = await supabase
              .from("product_variants")
              .insert({
                product_id: productId,
                name: variant.name,
                price: parseFloat(variant.price),
                sort_order: index,
              })
              .select()
              .single();

            if (insertError) throw insertError;

            // Map temp key to the new variant ID
            variantIdMapping[tempKey] = newVariant.id;
            newVariantIds.push(newVariant.id);
            
            console.log(`✅ Created: ${variant.name} (ID: ${newVariant.id})`);
          }
        }
      }

      // Find variants that were removed (exist in DB but not in form)
      const removedVariantIds = existingVariantIds.filter(
        (id) => !newVariantIds.includes(id)
      );

      if (removedVariantIds.length > 0) {
        console.log("🗑️ Deleting removed variants:", removedVariantIds);
        
        // Delete ingredients for removed variants first
        await supabase
          .from("product_variant_ingredients")
          .delete()
          .in("variant_id", removedVariantIds);

        // Then delete the variants
        await supabase
          .from("product_variants")
          .delete()
          .in("id", removedVariantIds);
      }

      // Delete ingredients that were explicitly marked for deletion
      if (
        productData.deletedIngredientIds &&
        productData.deletedIngredientIds.length > 0
      ) {
        console.log("🗑️ Deleting marked ingredients:", productData.deletedIngredientIds);
        await supabase
          .from("product_variant_ingredients")
          .delete()
          .in("id", productData.deletedIngredientIds);
      }

    } else {
      // ===== CREATE NEW PRODUCT =====
      console.log("➕ Creating new product");
      
      const { data, error } = await supabase
        .from("products")
        .insert(productPayload)
        .select()
        .single();

      if (error) throw error;
      productId = data.id;
      console.log("✅ Product created:", productId);

      // Create variants for new product
      if (productData.variants && productData.variants.length > 0) {
        const validVariants = productData.variants.filter(
          (v) => v.name && v.price
        );

        for (let index = 0; index < validVariants.length; index++) {
          const variant = validVariants[index];
          const tempKey = `variant_${index}`;

          console.log(`➕ Creating variant: ${variant.name}`);
          
          const { data: newVariant, error: variantError } = await supabase
            .from("product_variants")
            .insert({
              product_id: productId,
              name: variant.name,
              price: parseFloat(variant.price),
              sort_order: index,
            })
            .select()
            .single();

          if (variantError) throw variantError;

          variantIdMapping[tempKey] = newVariant.id;
          console.log(`✅ Created: ${variant.name} → ${newVariant.id}`);
        }
      }
    }

    console.log("\n📊 Variant ID Mapping:", variantIdMapping);

    // ===== HANDLE INGREDIENTS =====
    console.log("\n🥘 Processing ingredients...");
    
    if (productData.ingredients && productData.ingredients.length > 0) {
      const ingredientsToInsert = [];
      const ingredientsToUpdate = [];

      for (let i = 0; i < productData.ingredients.length; i++) {
        const ing = productData.ingredients[i];
        
        console.log(`\n🔍 Ingredient ${i + 1}:`, {
          id: ing.id,
          variant_key: ing.variant_key,
          item: ing.inventory_item_id,
          isExisting: ing.isExisting
        });

        // Skip invalid ingredients
        if (!ing.inventory_item_id || !ing.quantity || !ing.unit_id) {
          console.warn("⚠️ Skipping invalid ingredient");
          continue;
        }

        let variantId = null;

        // Map variant_key to actual variant_id
        if (ing.variant_key && ing.variant_key !== "base") {
          variantId = variantIdMapping[ing.variant_key];
          
          console.log(`  Mapping "${ing.variant_key}" → ${variantId || "NOT FOUND"}`);

          if (!variantId) {
            console.error(`❌ Cannot find variant for key: ${ing.variant_key}`);
            throw new Error(
              `Invalid variant reference: ${ing.variant_key}`
            );
          }
        } else {
          console.log("  Base product ingredient (no variant)");
        }

        const ingredientData = {
          product_id: productId,
          variant_id: variantId,
          inventory_item_id: ing.inventory_item_id,
          quantity: parseFloat(ing.quantity),
          unit_id: ing.unit_id,
        };

        // Check if this is an existing ingredient that needs updating
        const isExistingInDB = ing.isExisting && 
                               ing.id && 
                               !ing.id.toString().startsWith('temp_');

        if (isExistingInDB) {
          // UPDATE existing ingredient
          console.log(`  ✏️ Will update ingredient ID: ${ing.id}`);
          ingredientsToUpdate.push({
            id: ing.id,
            data: ingredientData
          });
        } else {
          // INSERT new ingredient
          console.log("  ➕ Will insert new ingredient");
          ingredientsToInsert.push(ingredientData);
        }
      }

      // Perform updates
      if (ingredientsToUpdate.length > 0) {
        console.log(`\n📝 Updating ${ingredientsToUpdate.length} ingredients...`);
        for (const update of ingredientsToUpdate) {
          const { error: updateError } = await supabase
            .from("product_variant_ingredients")
            .update(update.data)
            .eq("id", update.id);

          if (updateError) {
            console.error("❌ Update error:", updateError);
            throw new Error(`Failed to update ingredient: ${updateError.message}`);
          }
        }
        console.log("✅ All updates completed");
      }

      // Perform inserts
      if (ingredientsToInsert.length > 0) {
        console.log(`\n📥 Inserting ${ingredientsToInsert.length} new ingredients...`);
        console.log("Data:", JSON.stringify(ingredientsToInsert, null, 2));
        
        const { error: insertError } = await supabase
          .from("product_variant_ingredients")
          .insert(ingredientsToInsert);

        if (insertError) {
          console.error("❌ Insert error:", insertError);
          throw new Error(`Failed to insert ingredients: ${insertError.message}`);
        }
        console.log("✅ All inserts completed");
      }
    }

    console.log("\n🎉 Product saved successfully!");

    toast.success(
      editingProduct
        ? "Product updated successfully!"
        : "Product created successfully!",
      { id: saveToast }
    );

    setShowProductSidebar(false);
    setEditingProduct(null);
    setSelectedCategory(null);

    const currentActiveCategory = activeCategory;
    await loadCategories();

    if (currentActiveCategory) {
      setTimeout(() => {
        const categoryToRestore = categories.find(
          (c) => c.id === currentActiveCategory.id
        );
        if (categoryToRestore) {
          setActiveCategory(categoryToRestore);
        }
      }, 100);
    }

    return true;
  } catch (error) {
    console.error("❌ Error saving product:", error);
    toast.error("Failed to save product: " + error.message, {
      id: saveToast,
    });
    return false;
  }
};
  // Open delete confirmation dialog
  const confirmDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  };

  // Delete category with all products and cleanup
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    const deleteToast = toast.loading("Deleting category...");
    const category = categoryToDelete;

    try {
      // Get all products in this category
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, image_url")
        .eq("category_id", category.id);

      if (productsError) throw productsError;

      // Delete all products and their related data
      if (products && products.length > 0) {
        for (const product of products) {
          // Delete product variant ingredients
          await supabase
            .from("product_variant_ingredients")
            .delete()
            .eq("product_id", product.id);

          // Delete product variants
          await supabase
            .from("product_variants")
            .delete()
            .eq("product_id", product.id);

          // Delete product image from storage if exists
          if (product.image_url) {
            try {
              const urlParts = product.image_url.split("/");
              const bucketIndex = urlParts.findIndex(
                (part) => part === "product-images"
              );

              if (bucketIndex !== -1) {
                const filePath = urlParts.slice(bucketIndex + 1).join("/");
                await supabase.storage
                  .from("product-images")
                  .remove([filePath]);
              }
            } catch (storageError) {
              console.error("Error deleting product image:", storageError);
            }
          }

          // Delete the product
          await supabase
            .from("products")
            .delete()
            .eq("id", product.id);
        }
      }

      // Delete category image from storage if exists
      if (category.image_url) {
        try {
          const urlParts = category.image_url.split("/");
          const bucketIndex = urlParts.findIndex(
            (part) => part === "product-images" || part === "images"
          );

          if (bucketIndex !== -1) {
            const filePath = urlParts.slice(bucketIndex + 1).join("/");
            const bucket = urlParts[bucketIndex];
            await supabase.storage
              .from(bucket)
              .remove([filePath]);
          }
        } catch (storageError) {
          console.error("Error deleting category image:", storageError);
        }
      }

      // Finally, delete the category
      const { error: categoryError } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id);

      if (categoryError) throw categoryError;

      toast.success("Category deleted successfully", { id: deleteToast });

      // Reset active category if it was the deleted one
      if (activeCategory?.id === category.id) {
        setActiveCategory(null);
      }

      loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Error deleting category: " + error.message, {
        id: deleteToast,
      });
    } finally {
      setCategoryToDelete(null);
    }
  };

  // Delete product with image cleanup
  const handleDeleteProduct = async (product) => {
    const deleteToast = toast.loading("Deleting product...");

    try {
      // Delete product variants first
      const { error: variantsError } = await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", product.id);

      if (variantsError) throw variantsError;

      // Delete the product
      const { error: productError } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (productError) throw productError;

      // Delete image from storage if exists
      if (product.image_url) {
        try {
          // Extract file path from URL
          const urlParts = product.image_url.split("/");
          const bucketIndex = urlParts.findIndex(
            (part) => part === "product-images"
          );

          if (bucketIndex !== -1) {
            const filePath = urlParts.slice(bucketIndex + 1).join("/");

            const { error: storageError } = await supabase.storage
              .from("product-images")
              .remove([filePath]);

            if (storageError) {
              console.error("Error deleting image:", storageError);
            }
          }
        } catch (storageError) {
          console.error("Error parsing image URL:", storageError);
        }
      }

      toast.success("Product deleted successfully", { id: deleteToast });
      loadCategories();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Error deleting product: " + error.message, {
        id: deleteToast,
      });
    }
  };

  const uploadImage = async (file) => {
    if (!file) return null;

    try {
      const user = await getUser();
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("images")
        .upload(fileName, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);

      const newCategories = arrayMove(categories, oldIndex, newIndex);
      setCategories(newCategories);

      try {
        const updates = newCategories.map((cat, index) =>
          supabase
            .from("categories")
            .update({ sort_order: index })
            .eq("id", cat.id)
        );

        await Promise.all(updates);
      } catch (error) {
        console.error("Error updating category order:", error);
        loadCategories();
      }
    }
  };

  // FIXED: Calculate price - Use base_price directly, not adding to variants
  const calculateFinalPrice = (basePrice, discountPercentage) => {
    const discount = (basePrice * (discountPercentage || 0)) / 100;
    return (basePrice - discount).toFixed(2);
  };

  // Get price display text
  const getPriceDisplay = (product) => {
    if (product.discount_percentage > 0) {
      return (
        <>
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
            PKR{" "}
            {calculateFinalPrice(
              product.base_price,
              product.discount_percentage
            )}
          </span>
          <span className="text-xs text-gray-400 line-through ml-2">
            PKR {product.base_price}
          </span>
        </>
      );
    } else {
      return (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Starting from PKR {product.base_price}
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-96"></div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="animate-pulse space-y-6">
            <div className="flex space-x-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-24"
                ></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-gray-200 dark:bg-slate-700 rounded-lg"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedMenu) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Product Catalog
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your restaurant's menu items and categories
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <MenuIcon className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No menus found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Please create a menu first in the Menus section to organize your
              products
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Product Catalog
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your restaurant's menu items and categories
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {menus.length > 1 && (
              <div className="relative">
                <select
                  value={selectedMenu?.id || ""}
                  onChange={(e) => handleMenuChange(e.target.value)}
                  className="appearance-none bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-2 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowCategorySidebar(true)}
              disabled={categoriesLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {!categoriesLoading && categories.length > 0 && (
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                !activeCategory
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              All Products ({filteredProducts.length})
            </button>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map((cat) => cat.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex items-center space-x-2 overflow-x-auto">
                  {categories.map((category) => (
                    <SortableCategoryTab
                      key={category.id}
                      category={category}
                      isActive={activeCategory?.id === category.id}
                      onClick={() => setActiveCategory(category)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {categoriesLoading && (
          <div className="flex items-center space-x-4">
            <div className="animate-pulse flex space-x-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-24"
                ></div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {categoriesLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-gray-200 dark:bg-slate-700 rounded-lg"
                ></div>
              ))}
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No categories yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Start by creating your first product category for{" "}
              {selectedMenu.name}
            </p>
            <button
              onClick={() => setShowCategorySidebar(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create First Category</span>
            </button>
          </div>
        ) : (
          <div>
            {activeCategory && (
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {activeCategory.image_url ? (
                    <img
                      src={activeCategory.image_url}
                      alt={activeCategory.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {activeCategory.name}
                    </h2>
                    {activeCategory.subtitle && (
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {activeCategory.subtitle}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {activeCategory.products?.length || 0} products
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedCategory(activeCategory);
                      setEditingProduct(null);
                      setShowProductSidebar(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Product</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingCategory(activeCategory);
                      setShowCategorySidebar(true);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => confirmDeleteCategory(activeCategory)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm
                    ? "No products found matching your search"
                    : "No products in this category"}
                </p>
                {!searchTerm && activeCategory && (
                  <button
                    onClick={() => {
                      setSelectedCategory(activeCategory);
                      setEditingProduct(null);
                      setShowProductSidebar(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Add First Product
                  </button>
                )}
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
                    : "space-y-3"
                }
              >
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={
                      viewMode === "grid"
                        ? "bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow group"
                        : "flex items-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group"
                    }
                  >
                    {viewMode === "grid" ? (
                      <>
                        <div className="aspect-square bg-gray-50 dark:bg-slate-700 rounded-t-lg overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
                            {product.name}
                          </h4>
                          {product.categoryName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              {product.categoryName}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              {getPriceDisplay(product)}

                              <div className="flex items-center mt-1">
                                <div
                                  className={`w-2 h-2 rounded-full mr-2 ${
                                    product.is_active
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                  }`}
                                ></div>
                                <span
                                  className={`text-xs ${
                                    product.is_active
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {product.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    // Fetch variants
                                    const {
                                      data: variants,
                                      error: variantsError,
                                    } = await supabase
                                      .from("product_variants")
                                      .select("*")
                                      .eq("product_id", product.id)
                                      .order("sort_order", { ascending: true });

                                    if (variantsError) throw variantsError;

                                    // Fetch variant ingredients
                                    const {
                                      data: ingredients,
                                      error: ingredientsError,
                                    } = await supabase
                                      .from("product_variant_ingredients")
                                      .select(
                                        `
                                         id,
                                         product_id,
                                         variant_id,
                                         inventory_item_id,
                                         quantity,
                                         unit_id,
                                         inventory_items (
                                           id,
                                           name,
                                           sku,
                                           current_stock,
                                           unit_id,
                                           units (id, name, abbreviation)
                                         ),
                                         units (id, name, abbreviation)
                                      `
                                      )
                                      .eq("product_id", product.id);

                                    if (ingredientsError)
                                      throw ingredientsError;

                                    setEditingProduct({
                                      ...product,
                                      variants: variants || [],
                                      ingredients: ingredients || [],
                                    });
                                    setSelectedCategory(
                                      categories.find((c) =>
                                        c.products?.some(
                                          (p) => p.id === product.id
                                        )
                                      )
                                    );
                                    setShowProductSidebar(true);
                                  } catch (error) {
                                    console.error(
                                      "Error loading product details:",
                                      error
                                    );
                                    toast.error(
                                      "Error loading product details"
                                    );
                                  }
                                }}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(product);
                                }}
                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* List View */}
                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 ml-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {product.name}
                              </h4>
                              {product.categoryName && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {product.categoryName}
                                </p>
                              )}
                              {product.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                  {product.description}
                                </p>
                              )}
                              <div className="flex items-center mt-2 space-x-4">
                                {getPriceDisplay(product)}
                                <div className="flex items-center">
                                  <div
                                    className={`w-2 h-2 rounded-full mr-2 ${
                                      product.is_active
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                    }`}
                                  ></div>
                                  <span
                                    className={`text-xs ${
                                      product.is_active
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-600 dark:text-red-400"
                                    }`}
                                  >
                                    {product.is_active ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    // Fetch variants
                                    const {
                                      data: variants,
                                      error: variantsError,
                                    } = await supabase
                                      .from("product_variants")
                                      .select("*")
                                      .eq("product_id", product.id)
                                      .order("sort_order", { ascending: true });

                                    if (variantsError) throw variantsError;

                                    // Fetch variant ingredients
                                    const {
                                      data: ingredients,
                                      error: ingredientsError,
                                    } = await supabase
                                      .from("product_variant_ingredients")
                                      .select(
                                        `
          id,
          product_id,
          variant_id,
          inventory_item_id,
          quantity,
          unit_id,
          inventory_items (
            id,
            name,
            sku,
            current_stock,
            unit_id,
            units (id, name, abbreviation)
          ),
          units (id, name, abbreviation)
        `
                                      )
                                      .eq("product_id", product.id);

                                    if (ingredientsError)
                                      throw ingredientsError;

                                    setEditingProduct({
                                      ...product,
                                      variants: variants || [],
                                      ingredients: ingredients || [],
                                    });
                                    setSelectedCategory(
                                      categories.find((c) =>
                                        c.products?.some(
                                          (p) => p.id === product.id
                                        )
                                      )
                                    );
                                    setShowProductSidebar(true);
                                  } catch (error) {
                                    console.error(
                                      "Error loading product details:",
                                      error
                                    );
                                    toast.error(
                                      "Error loading product details"
                                    );
                                  }
                                }}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(product);
                                }}
                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebars */}
      <RightSidebar
        isOpen={showProductSidebar}
        onClose={() => {
          setShowProductSidebar(false);
          setEditingProduct(null);
          setSelectedCategory(null);
        }}
        title={editingProduct ? "Edit Product" : "Add New Product"}
        width="w-[600px]"
      >
        <ProductForm
          product={editingProduct}
          category={selectedCategory || activeCategory}
          onSave={handleProductSubmit}
        />
      </RightSidebar>

      <RightSidebar
        isOpen={showCategorySidebar}
        onClose={() => {
          setShowCategorySidebar(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? "Edit Category" : "Add New Category"}
        width="w-[500px]"
      >
        <CategoryForm
          category={editingCategory}
          onSave={handleCategorySubmit}
        />
      </RightSidebar>

      {/* Delete Category Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? This will permanently delete the category and all ${categoryToDelete?.products?.length || 0} products within it. This action cannot be undone.`}
        confirmText="Delete Category"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
