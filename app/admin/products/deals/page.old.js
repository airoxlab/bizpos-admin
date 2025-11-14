// app/admin/products/deals/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { Plus, Edit2, Trash2, Tag, Package, Eye, X } from "lucide-react";
import DealCategoryForm from "@/components/deals/DealCategoryForm";
import DealProductsManager from "@/components/deals/DealProductsManager";

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dealToDelete, setDealToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [viewingDeal, setViewingDeal] = useState(null);

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      const user = await getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("deal_categories")
        .select(
          `
          *,
          deal_products (
            id,
            quantity,
            allow_flavor_change,
            products (
              id,
              name,
              image_url
            ),
            product_variants (
              id,
              name,
              price
            )
          )
        `
        )
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error("Error loading deals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (deal) => {
    setEditingDeal(deal);
    setShowModal(true);
  };

  const handleDeleteClick = (deal) => {
    setDealToDelete(deal);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!dealToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("deal_categories")
        .delete()
        .eq("id", dealToDelete.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setDealToDelete(null);
      loadDeals();
    } catch (error) {
      console.error("Error deleting deal:", error);
    } finally {
      setDeleting(false);
    }
  };

  const openModal = () => {
    setEditingDeal(null);
    setShowModal(true);
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setEditingDeal(null);
    loadDeals();
  };

  const handleManageProducts = (deal) => {
    setSelectedDeal(deal);
    setShowProductsModal(true);
  };

  const handleViewDeal = (deal) => {
    setViewingDeal(deal);
  };

  const renderCardPreview = (design) => {
    if (!design) return null;

    const getBackgroundStyle = () => {
      const bg = design.background;
      let style = {};

      if (bg.type === "solid") {
        style.backgroundColor = bg.solidColor;
      } else if (bg.type === "gradient") {
        style.backgroundImage = `linear-gradient(${bg.direction}, ${bg.gradientStart}, ${bg.gradientEnd})`;
      } else if (bg.type === "pattern") {
        switch (bg.pattern) {
          case "stripes":
            style.backgroundImage = `repeating-linear-gradient(45deg, ${bg.gradientStart}, ${bg.gradientStart} 10px, ${bg.gradientEnd} 10px, ${bg.gradientEnd} 20px)`;
            break;
          case "dots":
            style.backgroundImage = `radial-gradient(circle, ${bg.gradientEnd} 2px, transparent 2px)`;
            style.backgroundSize = "20px 20px";
            style.backgroundColor = bg.gradientStart;
            break;
          case "grid":
            style.backgroundImage = `linear-gradient(${bg.gradientEnd} 1px, transparent 1px), linear-gradient(90deg, ${bg.gradientEnd} 1px, transparent 1px)`;
            style.backgroundSize = "20px 20px";
            style.backgroundColor = bg.gradientStart;
            break;
        }
      }

      style.opacity = bg.opacity / 100;
      return style;
    };

    const getShadowClass = (shadow) => {
      const shadows = {
        none: "",
        sm: "shadow-sm",
        md: "shadow-md",
        lg: "shadow-lg",
        xl: "shadow-xl",
        "2xl": "shadow-2xl",
      };
      return shadows[shadow] || "shadow-lg";
    };

    return (
      <div
        style={{
          ...getBackgroundStyle(),
          borderRadius: `${design.border.radius}px`,
          border:
            design.border.width > 0
              ? `${design.border.width}px solid ${design.border.color}`
              : "none",
          position: "relative",
          overflow: "hidden",
        }}
        className={`w-full h-48 flex flex-col justify-center items-center p-4 ${getShadowClass(
          design.border.shadow
        )}`}
      >
        {/* Logo */}
        {design.logo?.show && design.logo?.url && (
          <img
            src={design.logo.url}
            alt="Logo"
            style={{
              position: "absolute",
              top: design.logo.position?.includes("top") ? "8px" : "auto",
              bottom: design.logo.position?.includes("bottom") ? "8px" : "auto",
              left: design.logo.position?.includes("left") ? "8px" : "auto",
              right: design.logo.position?.includes("right") ? "8px" : "auto",
              width: `${design.logo.size || 60}px`,
              height: `${design.logo.size || 60}px`,
              opacity: (design.logo.opacity || 100) / 100,
            }}
            className="object-contain"
          />
        )}

        {/* Icon */}
        {design.icon?.show && (
          <div
            style={{
              position: "absolute",
              fontSize: `${design.icon.size || 48}px`,
              top: design.icon.position?.includes("top") ? "8px" : "auto",
              bottom: design.icon.position?.includes("bottom") ? "8px" : "auto",
              left: design.icon.position?.includes("left") ? "8px" : "auto",
              right: design.icon.position?.includes("right") ? "8px" : "auto",
            }}
          >
            {design.icon.emoji}
          </div>
        )}

        {/* Badge */}
        {design.badge?.show && (
          <div
            style={{
              backgroundColor: design.badge.bgColor,
              color: design.badge.textColor,
              position: "absolute",
              top: design.badge.position?.includes("top") ? "8px" : "auto",
              right: design.badge.position?.includes("right") ? "8px" : "auto",
              fontSize: `${design.badge.fontSize || 12}px`,
            }}
            className="px-2 py-1 rounded-full font-bold"
          >
            {design.badge.text}
          </div>
        )}

        {/* Title */}
        <h3
          style={{
            color: design.title.color,
            fontSize: "24px",
            fontWeight: design.title.fontWeight,
            fontFamily: design.title.fontFamily,
            textShadow: design.title.shadow
              ? "2px 2px 4px rgba(0,0,0,0.5)"
              : "none",
          }}
          className="text-center"
        >
          {design.title.text}
        </h3>

        {/* Subtitle */}
        {design.subtitle?.text && (
          <p
            style={{
              color: design.subtitle.color,
              fontSize: "14px",
              fontFamily: design.subtitle.fontFamily,
              marginTop: "4px",
            }}
          >
            {design.subtitle.text}
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 bg-gray-200 dark:bg-slate-700 rounded-lg"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Deals Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage your deals with products and ingredients
          </p>
        </div>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Deal</span>
        </button>
      </div>

      {/* Deals Grid */}
      {deals.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            No deals found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Create your first deal to offer special product bundles to your
            customers.
          </p>
          <button
            onClick={openModal}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Your First Deal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {deals.map((deal) => (
  <div
    key={deal.id}
    className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
  >
    {/* Card Design or Image */}
    <div className="relative">
      {deal.card_design_data ? (
        renderCardPreview(deal.card_design_data)
      ) : deal.image_url ? (
        <img
          src={deal.image_url}
          alt={deal.name}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Tag className="w-16 h-16 text-white opacity-50" />
        </div>
      )}

      {/* Actions Overlay */}
      <div className="absolute top-2 right-2 flex items-center space-x-1">
        <button
          onClick={() => handleViewDeal(deal)}
          className="p-2 bg-white dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-lg"
          title="View details"
        >
          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        <button
          onClick={() => handleEdit(deal)}
          className="p-2 bg-white dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-lg"
          title="Edit deal"
        >
          <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        <button
          onClick={() => handleDeleteClick(deal)}
          className="p-2 bg-white dark:bg-slate-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-lg"
          title="Delete deal"
        >
          <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
        </button>
      </div>
    </div>

    {/* Deal Info */}
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            {deal.name}
          </h3>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            Rs {deal.price}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            deal.is_active
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
              : "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-400"
          }`}
        >
          {deal.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Products List */}
      {deal.deal_products && deal.deal_products.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Included Items:
          </p>
          {deal.deal_products.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex items-center text-xs text-gray-700 dark:text-gray-300"
            >
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>
              <span className="font-medium">{item.quantity}x</span>
              <span className="ml-1">
                {item.products?.name}
                {item.product_variants && ` (${item.product_variants.name})`}
              </span>
            </div>
          ))}
          {deal.deal_products.length > 3 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-4">
              +{deal.deal_products.length - 3} more
            </p>
          )}
        </div>
      )}

      {/* Products Count */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-3 pb-3 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center space-x-1">
          <Package className="w-4 h-4" />
          <span>
            {deal.deal_products?.length || 0} product
            {deal.deal_products?.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Manage Products Button */}
      <button
        onClick={() => handleManageProducts(deal)}
        className="w-full px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-center space-x-2"
      >
        <Package className="w-4 h-4" />
        <span>Manage Products</span>
      </button>
    </div>
  </div>
))}
        </div>
      )}

      {/* Create/Edit Deal Modal */}
     {/* Create/Edit Deal Drawer - Right Side */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingDeal ? "Edit Deal" : "Create New Deal"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <DealCategoryForm
                onSuccess={handleFormSuccess}
                onCancel={() => setShowModal(false)}
                initialData={editingDeal}
              />
            </div>
          </div>
        </>
      )}

 {/* Manage Products Modal - FULL SCREEN */}
      {showProductsModal && selectedDeal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowProductsModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full h-full overflow-hidden flex flex-col shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Manage Products - {selectedDeal.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Add products and manage flavors for this deal
                  </p>
                </div>
                <button
                  onClick={() => setShowProductsModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden p-6">
                <DealProductsManager
                  dealId={selectedDeal.id}
                  onClose={() => {
                    setShowProductsModal(false);
                    loadDeals();
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
      {/* View Deal Modal */}
    {/* View Deal Modal */}
{viewingDeal && (
  <>
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      onClick={() => setViewingDeal(null)}
    />
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {viewingDeal.name}
          </h2>
          <button
            onClick={() => setViewingDeal(null)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Card Design */}
          {viewingDeal.card_design_data && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Card Design
              </h3>
              <div className="border-2 border-gray-200 dark:border-slate-600 rounded-lg p-4 bg-gray-50 dark:bg-slate-700">
                {renderCardPreview(viewingDeal.card_design_data)}
              </div>
            </div>
          )}

          {/* Price */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Price
            </h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              Rs {viewingDeal.price}
            </p>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Products ({viewingDeal.deal_products?.length || 0})
            </h3>
            {viewingDeal.deal_products?.length > 0 ? (
              <div className="space-y-2">
                {viewingDeal.deal_products.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {item.products?.image_url && (
                        <img
                          src={item.products.image_url}
                          alt={item.products.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.products?.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.product_variants ? (
                            <>
                              {item.product_variants.name} • Rs{" "}
                              {item.product_variants.price}
                            </>
                          ) : (
                            <>Rs {item.products?.base_price}</>
                          )}{" "}
                          • Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                    {item.allow_flavor_change && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded-full">
                        Customizable
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No products added yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  </>
)}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Deal
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
                      Are you sure you want to delete "{dealToDelete?.name}"?
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This action cannot be undone. All products in this deal
                      will be removed.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {deleting ? "Deleting..." : "Delete Deal"}
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