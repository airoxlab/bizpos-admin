// app/test-deals/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { Package, ShoppingCart, CheckCircle, Trash2, Eye, X } from "lucide-react";
import toast from "react-hot-toast";

export default function TestDealsPage() {
  const [deals, setDeals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [user, setUser] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [selectedDealForFlavors, setSelectedDealForFlavors] = useState(null);
  const [flavorSelections, setFlavorSelections] = useState({});

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    const currentUser = await getUser();
    setUser(currentUser);
    if (currentUser) {
      await loadDeals(currentUser);
      await loadOrders(currentUser);
    }
    setLoading(false);
  };

  const loadDeals = async (currentUser) => {
    try {
      // Load deals table (not deal_categories)
      console.log("Loading deals for user:", currentUser.id);

      const { data: dealsData, error: dealsError } = await supabase
        .from("deals")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (dealsError) {
        console.error("Error loading deals:", dealsError);
        toast.error("Failed to load deals: " + dealsError.message);
        return;
      }

      console.log("Deals loaded:", dealsData);

      // Then load deal products for each deal
      if (dealsData && dealsData.length > 0) {
        for (let deal of dealsData) {
          const { data: productsData, error: productsError } = await supabase
            .from("deal_products")
            .select("*")
            .eq("deal_id", deal.id);

          if (productsError) {
            console.error("Error loading products for deal", deal.id, ":", productsError);
            deal.deal_products = [];
          } else {
            // Load flavors for each product
            if (productsData && productsData.length > 0) {
              for (let product of productsData) {
                const { data: flavorsData, error: flavorsError } = await supabase
                  .from("deal_product_flavors")
                  .select("*")
                  .eq("deal_product_id", product.id);

                if (!flavorsError && flavorsData) {
                  product.flavors = flavorsData;
                } else {
                  product.flavors = [];
                }
              }
            }
            console.log("Products for deal", deal.name, ":", productsData);
            deal.deal_products = productsData || [];
          }
        }
      }

      console.log("Final deals with products:", dealsData);
      setDeals(dealsData || []);

    } catch (error) {
      console.error("Error loading deals - Exception:", error);
      toast.error("Failed to load deals");
    }
  };

  const loadOrders = async (currentUser) => {
    try {
      console.log("Loading orders for user:", currentUser.id);

      // First load just the orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (ordersError) {
        console.error("Error loading orders:", ordersError);
        toast.error("Failed to load orders: " + ordersError.message);
        return;
      }

      console.log("Orders loaded:", ordersData);

      // Then load order items for each order
      if (ordersData && ordersData.length > 0) {
        for (let order of ordersData) {
          const { data: itemsData, error: itemsError } = await supabase
            .from("order_items")
            .select(
              `
              *,
              products (
                name,
                image_url
              ),
              product_variants (
                name
              )
            `
            )
            .eq("order_id", order.id);

          if (itemsError) {
            console.error("Error loading items for order", order.id, ":", itemsError);
            order.order_items = [];
          } else {
            console.log("Items for order", order.order_number, ":", itemsData);
            order.order_items = itemsData || [];
          }
        }
      }

      console.log("Orders with items:", ordersData);
      setOrders(ordersData || []);
    } catch (error) {
      console.error("Error loading orders - Exception:", error);
    }
  };

  const addDealToCart = (deal) => {
    // Check if any products have flavors
    const hasFlavorProducts = deal.deal_products?.some(
      (product) => product.flavors && product.flavors.length > 0
    );

    if (hasFlavorProducts) {
      // Show flavor selection modal
      setSelectedDealForFlavors(deal);
      setShowFlavorModal(true);
      // Initialize flavor selections
      const initialSelections = {};
      deal.deal_products.forEach((product) => {
        if (product.flavors && product.flavors.length > 0) {
          // Initialize with first flavor or null
          initialSelections[product.id] = product.flavors[0]?.id || null;
        }
      });
      setFlavorSelections(initialSelections);
    } else {
      // No flavors, add directly to cart
      addToCartWithFlavors(deal, {});
    }
  };

  const addToCartWithFlavors = (deal, selectedFlavors) => {
    // Prepare deal products with selected flavors
    const productsWithFlavors = deal.deal_products.map((product) => {
      const selectedFlavorId = selectedFlavors[product.id];
      const selectedFlavor = product.flavors?.find((f) => f.id === selectedFlavorId);

      return {
        ...product,
        selectedFlavor: selectedFlavor || null,
      };
    });

    // Check if deal already in cart with same flavor selections
    const existingIndex = cart.findIndex((item) => {
      if (item.deal_id !== deal.id) return false;
      // Check if flavor selections match
      return item.deal_products.every((cartProd, idx) => {
        const newProd = productsWithFlavors[idx];
        return cartProd.selectedFlavor?.id === newProd.selectedFlavor?.id;
      });
    });

    if (existingIndex >= 0) {
      // Increase quantity
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
      toast.success(`Added another ${deal.name} to cart`);
    } else {
      // Add new item
      setCart([
        ...cart,
        {
          deal_id: deal.id,
          name: deal.name,
          description: deal.description,
          price: deal.price,
          quantity: 1,
          deal_products: productsWithFlavors,
          image_url: deal.image_url,
        },
      ]);
      toast.success(`${deal.name} added to cart`);
    }
    setShowCart(true);
    setShowFlavorModal(false);
    setSelectedDealForFlavors(null);
  };

  const removeFromCart = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    toast.success("Item removed from cart");
  };

  const updateCartQuantity = (index, quantity) => {
    if (quantity < 1) {
      removeFromCart(index);
      return;
    }
    const newCart = [...cart];
    newCart[index].quantity = quantity;
    setCart(newCart);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `ORD-${timestamp}${random}`;
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    setOrderLoading(true);
    try {
      const orderNumber = generateOrderNumber();
      const subtotal = calculateTotal();
      const taxAmount = subtotal * 0.0; // No tax for testing
      const totalAmount = subtotal + taxAmount;

      // Create order with deal information in order_instructions including flavors
      const dealsSummary = cart
        .map(
          (item) =>
            `${item.quantity}x ${item.name} (Rs ${item.price} each) - Includes: ${item.deal_products
              .map((p) => {
                const flavorInfo = p.selectedFlavor ? ` [${p.selectedFlavor.flavor_name}]` : "";
                return `${p.quantity}x ${p.name}${flavorInfo}`;
              })
              .join(", ")}`
        )
        .join(" | ");

      const { error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          order_type: "walkin",
          subtotal: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          payment_method: "Cash",
          payment_status: "Paid",
          order_status: "Pending",
          order_instructions: dealsSummary,
          order_date: new Date().toISOString().split("T")[0],
          order_time: new Date().toTimeString().split(" ")[0],
        });

      if (orderError) throw orderError;

      // Deduct inventory for each flavor ingredient
      console.log("=== Starting Inventory Deduction ===");
      console.log("Cart items:", cart);

      for (const cartItem of cart) {
        console.log(`\nProcessing cart item: ${cartItem.name} (x${cartItem.quantity})`);

        for (const product of cartItem.deal_products) {
          console.log(`  Product: ${product.name} (x${product.quantity})`);
          console.log(`  Selected Flavor:`, product.selectedFlavor);

          if (product.selectedFlavor) {
            // Load flavor ingredients
            console.log(`  Loading ingredients for flavor ID: ${product.selectedFlavor.id}`);
            const { data: ingredients, error: ingredientsError } = await supabase
              .from("deal_product_flavor_ingredients")
              .select("*")
              .eq("deal_product_flavor_id", product.selectedFlavor.id);

            if (ingredientsError) {
              console.error("  Error loading ingredients:", ingredientsError);
              toast.error(`Failed to load ingredients: ${ingredientsError.message}`);
              continue;
            }

            console.log(`  Found ${ingredients?.length || 0} ingredients:`, ingredients);

            if (!ingredients || ingredients.length === 0) {
              console.warn(`  No ingredients found for flavor: ${product.selectedFlavor.flavor_name}`);
              toast.warning(`No ingredients configured for ${product.selectedFlavor.flavor_name}`);
              continue;
            }

            // Deduct from inventory
            for (const ingredient of ingredients) {
              const totalQuantity =
                ingredient.quantity_per_item * product.quantity * cartItem.quantity;

              console.log(`    Ingredient ID: ${ingredient.inventory_item_id}`);
              console.log(`    Quantity per item: ${ingredient.quantity_per_item}`);
              console.log(`    Total to deduct: ${totalQuantity}`);

              // Get current inventory
              const { data: currentInventory, error: getError } = await supabase
                .from("inventory_items")
                .select("id, name, current_stock")
                .eq("id", ingredient.inventory_item_id)
                .single();

              if (getError) {
                console.error(`    Error getting inventory for ID ${ingredient.inventory_item_id}:`, getError);
                toast.error(`Failed to get inventory: ${getError.message}`);
                continue;
              }

              if (!currentInventory) {
                console.error(`    Inventory item not found: ${ingredient.inventory_item_id}`);
                toast.error(`Inventory item not found`);
                continue;
              }

              console.log(`    Current inventory:`, currentInventory);
              console.log(`    Current stock: ${currentInventory.current_stock}`);

              // Check if enough inventory
              if (currentInventory.current_stock < totalQuantity) {
                console.warn(`    Insufficient inventory! Need: ${totalQuantity}, Have: ${currentInventory.current_stock}`);
                toast.warning(`Low stock for ${currentInventory.name || 'item'}`);
              }

              // Update inventory
              const newStock = currentInventory.current_stock - totalQuantity;
              console.log(`    New stock will be: ${newStock}`);

              const { error: updateError } = await supabase
                .from("inventory_items")
                .update({ current_stock: newStock })
                .eq("id", ingredient.inventory_item_id);

              if (updateError) {
                console.error(`    Error updating inventory:`, updateError);
                toast.error(`Failed to update inventory: ${updateError.message}`);
              } else {
                console.log(`    ✓ Successfully updated inventory`);
              }
            }
          } else {
            console.log(`  No flavor selected for ${product.name}`);
          }
        }
      }
      console.log("=== Inventory Deduction Complete ===");

      toast.success(`Order ${orderNumber} placed successfully! Inventory updated.`);
      setCart([]);
      setShowCart(false);
      await loadOrders(user);
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order: " + error.message);
    } finally {
      setOrderLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast.success(`Order status updated to ${newStatus}`);
      await loadOrders(user);
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order status");
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Deals Testing Page
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Test your deals and place orders
            </p>
          </div>
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* Deals Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Available Deals
          </h2>
          {deals.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No active deals found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Create some deals in the admin panel to test them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Deal Image */}
                  <div className="relative">
                    {deal.image_url ? (
                      <img
                        src={deal.image_url}
                        alt={deal.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Package className="w-16 h-16 text-white opacity-50" />
                      </div>
                    )}
                  </div>

                  {/* Deal Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                      {deal.name}
                    </h3>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-3">
                      Rs {deal.price}
                    </p>

                    {/* Products in Deal */}
                    {deal.deal_products && deal.deal_products.length > 0 && (
                      <div className="mb-4 space-y-1">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Includes:
                        </p>
                        {deal.deal_products.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center text-xs text-gray-700 dark:text-gray-300"
                          >
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>
                            <span className="font-medium">{item.quantity}x</span>
                            <span className="ml-1">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => addDealToCart(deal)}
                      className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Orders
          </h2>
          {orders.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
              <p className="text-gray-500 dark:text-gray-400">
                No orders yet. Place your first order!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {order.order_number}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.order_status === "Completed"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                            : order.order_status === "Cancelled"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"
                        }`}
                      >
                        {order.order_status}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedOrder(
                            selectedOrder?.id === order.id ? null : order
                          )
                        }
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                        Rs {order.total_amount}
                      </p>
                      {order.order_instructions && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 p-3 rounded-lg">
                          <p className="font-medium text-gray-900 dark:text-white mb-1">
                            Deals Summary:
                          </p>
                          <p className="whitespace-pre-wrap">{order.order_instructions}</p>
                        </div>
                      )}
                    </div>
                    {order.order_status !== "Completed" &&
                      order.order_status !== "Cancelled" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "Completed")}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 ml-4"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Mark Complete</span>
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowCart(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl z-50 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Shopping Cart
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Your cart is empty
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </h3>
                          <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                            Rs {item.price} each
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>

                      {/* Products in this deal */}
                      <div className="mb-3 space-y-1">
                        {item.deal_products.map((prod) => (
                          <div
                            key={prod.id}
                            className="text-xs text-gray-700 dark:text-gray-300"
                          >
                            <div className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>
                              <span>{prod.quantity}x {prod.name}</span>
                            </div>
                            {prod.selectedFlavor && (
                              <div className="ml-5 text-indigo-600 dark:text-indigo-400">
                                Flavor: {prod.selectedFlavor.flavor_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() =>
                              updateCartQuantity(index, item.quantity - 1)
                            }
                            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-500 transition-colors"
                          >
                            -
                          </button>
                          <span className="font-medium text-gray-900 dark:text-white w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateCartQuantity(index, item.quantity + 1)
                            }
                            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-500 transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Rs {item.price * item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t border-gray-200 dark:border-slate-700 p-6 space-y-4">
                <div className="flex items-center justify-between text-xl font-bold text-gray-900 dark:text-white">
                  <span>Total:</span>
                  <span>Rs {calculateTotal()}</span>
                </div>
                <button
                  onClick={placeOrder}
                  disabled={orderLoading}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {orderLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Place Order</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Flavor Selection Modal */}
      {showFlavorModal && selectedDealForFlavors && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowFlavorModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Select Flavors
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Choose flavors for: {selectedDealForFlavors.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowFlavorModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {selectedDealForFlavors.deal_products.map((product) => {
                  if (!product.flavors || product.flavors.length === 0) {
                    return (
                      <div
                        key={product.id}
                        className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4"
                      >
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                          {product.quantity}x {product.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          No flavor options available
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={product.id}
                      className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4"
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                        {product.quantity}x {product.name}
                      </h3>
                      <div className="space-y-2">
                        {product.flavors.map((flavor) => (
                          <label
                            key={flavor.id}
                            className="flex items-center p-3 bg-white dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors border-2 border-transparent has-[:checked]:border-indigo-500"
                          >
                            <input
                              type="radio"
                              name={`flavor-${product.id}`}
                              value={flavor.id}
                              checked={flavorSelections[product.id] === flavor.id}
                              onChange={(e) => {
                                setFlavorSelections({
                                  ...flavorSelections,
                                  [product.id]: flavor.id,
                                });
                              }}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="ml-3 text-gray-900 dark:text-white font-medium">
                              {flavor.flavor_name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end space-x-3">
                <button
                  onClick={() => setShowFlavorModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    addToCartWithFlavors(selectedDealForFlavors, flavorSelections)
                  }
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
