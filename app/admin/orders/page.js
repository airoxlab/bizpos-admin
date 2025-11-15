// app/admin/orders/page.js
"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Phone,
  MapPin,
  Truck,
  Coffee,
  DollarSign,
  AlertTriangle,
  X,
  Check,
  Printer,
  Package,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  Download,
  RefreshCw,
  MoreVertical,
  Edit3,
  ChevronDown,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import toast from "react-hot-toast";
import RightSidebar from "@/components/ui/RightSidebar";

export default function AdminOrdersPage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [viewMode, setViewMode] = useState("card"); // card, table, analytics
  const [showOrderSidebar, setShowOrderSidebar] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const orderTypes = [
    { value: "all", label: "All Orders", icon: ShoppingBag },
    { value: "walkin", label: "Walk-in", icon: Coffee },
    { value: "takeaway", label: "Takeaway", icon: Package },
    { value: "delivery", label: "Delivery", icon: Truck },
  ];

  const statusOptions = [
    { value: "all", label: "All Status", color: "gray" },
    { value: "Pending", label: "Pending", color: "yellow" },
    { value: "Preparing", label: "Preparing", color: "blue" },
    { value: "Ready", label: "Ready", color: "purple" },
    { value: "Completed", label: "Completed", color: "green" },
    { value: "Cancelled", label: "Cancelled", color: "red" },
  ];

  const paymentMethods = [
    { value: "all", label: "All Payments" },
    { value: "Cash", label: "Cash" },
    { value: "EasyPaisa", label: "EasyPaisa" },
    { value: "JazzCash", label: "JazzCash" },
    { value: "Bank", label: "Bank Transfer" },
    { value: "Unpaid", label: "Unpaid" },
  ];

  const dateFilterOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "custom", label: "Custom Range" },
  ];

  const cancellationReasons = [
    "Customer requested cancellation",
    "Out of stock items",
    "Kitchen issues",
    "Payment problems",
    "Delivery not possible",
    "Other",
  ];

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [
    user,
    orderTypeFilter,
    statusFilter,
    paymentFilter,
    dateFilter,
    customDateFrom,
    customDateTo,
    searchTerm,
  ]);

  const initializePage = async () => {
    try {
      const userData = await getUser();
      if (!userData) {
        window.location.href = "/";
        return;
      }
      setUser(userData);
    } catch (error) {
      console.error("Error initializing:", error);
      toast.error("Error loading page");
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const today = new Date();
    let from, to;

    switch (dateFilter) {
      case "today":
        from = to = today.toISOString().split("T")[0];
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        from = to = yesterday.toISOString().split("T")[0];
        break;
      case "this_week":
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - today.getDay());
        from = firstDay.toISOString().split("T")[0];
        to = today.toISOString().split("T")[0];
        break;
      case "this_month":
        from = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        to = today.toISOString().split("T")[0];
        break;
      case "last_month":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = lastMonth.toISOString().split("T")[0];
        to = new Date(today.getFullYear(), today.getMonth(), 0)
          .toISOString()
          .split("T")[0];
        break;
      case "custom":
        from = customDateFrom;
        to = customDateTo;
        break;
      default:
        from = to = today.toISOString().split("T")[0];
    }

    return { from, to };
  };

const fetchOrders = async () => {
    if (!user) {
      console.log("No user found");
      return;
    }

    try {
      setLoading(true);
      const { from, to } = getDateRange();

      console.log("Fetching orders for user:", user.id);
      console.log("Date range:", { from, to });

      let query = supabase
        .from("orders")
        .select(
          `
          *,
          customers (
            id,
            full_name,
            phone,
            email,
            addressline
          ),
          cashiers:cashier_id (
            id,
            name
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Apply filters
      if (orderTypeFilter !== "all") {
        query = query.eq("order_type", orderTypeFilter);
      }

      if (statusFilter !== "all") {
        query = query.eq("order_status", statusFilter);
      }

      if (paymentFilter !== "all") {
        query = query.eq("payment_method", paymentFilter);
      }

      if (from) query = query.gte("order_date", from);
      if (to) query = query.lte("order_date", to);

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log("Orders fetched successfully:", data?.length || 0);

      // Client-side search
      let filteredData = data || [];
      if (searchTerm) {
        filteredData = filteredData.filter(
          (order) =>
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.customers?.full_name || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
        );
      }

      setOrders(filteredData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      
      // More specific error messages
      if (error.code === "PGRST116") {
        toast.error("Orders table not found. Please check your database setup.");
      } else if (error.code === "42501") {
        toast.error("Permission denied. Please check Row Level Security policies.");
      } else if (error.message) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error("Error loading orders. Check console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId) => {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at");

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error) {
      console.error("Error fetching order items:", error);
      toast.error("Error loading order items");
    }
  };

  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
    fetchOrderItems(order.id);
    setShowOrderSidebar(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedOrder) return;

    const updateToast = toast.loading("Updating order status...");

    try {
      const updateData = {
        order_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "Cancelled" && cancelReason) {
        updateData.cancellation_reason = cancelReason;
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", selectedOrder.id);

      if (error) throw error;

      toast.success(`Order status updated to ${newStatus}`, { id: updateToast });
      setShowStatusModal(false);
      setSelectedStatus("");
      setCancelReason("");
      fetchOrders();
      setSelectedOrder({ ...selectedOrder, order_status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update order status", { id: updateToast });
    }
  };

  const handleMarkAllCompleted = async () => {
    const pendingOrders = orders.filter(
      o => o.order_status !== "Completed" && o.order_status !== "Cancelled"
    );

    if (pendingOrders.length === 0) {
      toast.error("No orders to mark as completed");
      return;
    }

    const loadingToast = toast.loading(`Marking ${pendingOrders.length} orders as completed...`);

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          order_status: "Completed",
          updated_at: new Date().toISOString()
        })
        .in('id', pendingOrders.map(o => o.id));

      if (error) throw error;

      toast.success(`${pendingOrders.length} orders marked as completed!`, { id: loadingToast });
      fetchOrders();
    } catch (error) {
      console.error("Error marking orders as completed:", error);
      toast.error("Failed to mark orders as completed", { id: loadingToast });
    }
  };

  const exportToCSV = () => {
    if (orders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const csvData = orders.map((order) => ({
      "Order Number": order.order_number,
      Date: order.order_date,
      Time: order.order_time,
      Customer: order.customers
        ? `${order.customers.first_name} ${order.customers.last_name}`
        : "Walk-in",
      Type: order.order_type,
      Status: order.order_status,
      "Payment Method": order.payment_method,
      "Payment Status": order.payment_status,
      Subtotal: order.subtotal,
      Discount: order.discount_amount || 0,
      Total: order.total_amount,
    }));

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(","),
      ...csvData.map((row) =>
        headers.map((header) => `"${row[header]}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Orders exported successfully!");
  };

  // Analytics calculations
  const getTotalRevenue = () => {
    return orders
      .filter((o) => o.order_status === "Completed")
      .reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
  };

  const getAverageOrderValue = () => {
    const completedOrders = orders.filter((o) => o.order_status === "Completed");
    return completedOrders.length > 0
      ? getTotalRevenue() / completedOrders.length
      : 0;
  };

  const getOrdersByStatus = () => {
    const breakdown = {};
    orders.forEach((order) => {
      const status = order.order_status;
      if (!breakdown[status]) {
        breakdown[status] = { count: 0, revenue: 0 };
      }
      breakdown[status].count += 1;
      if (status === "Completed") {
        breakdown[status].revenue += parseFloat(order.total_amount);
      }
    });
    return breakdown;
  };

  const getOrdersByType = () => {
    const breakdown = {};
    orders.forEach((order) => {
      const type = order.order_type;
      if (!breakdown[type]) {
        breakdown[type] = { count: 0, revenue: 0 };
      }
      breakdown[type].count += 1;
      if (order.order_status === "Completed") {
        breakdown[type].revenue += parseFloat(order.total_amount);
      }
    });
    return breakdown;
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending: "from-yellow-500 to-yellow-600",
      Preparing: "from-blue-500 to-blue-600",
      Ready: "from-purple-500 to-purple-600",
      Completed: "from-green-500 to-green-600",
      Cancelled: "from-red-500 to-red-600",
    };
    return colors[status] || "from-gray-500 to-gray-600";
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      Preparing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      Ready: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      Completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  const ordersByStatus = getOrdersByStatus();
  const ordersByType = getOrdersByType();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Orders Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track and manage customer orders
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchOrders()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleMarkAllCompleted}
              disabled={orders.filter(o => o.order_status !== "Completed" && o.order_status !== "Cancelled").length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Mark All Completed</span>
            </button>

            <button
              onClick={exportToCSV}
              disabled={orders.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode("card")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "card"
                    ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("analytics")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "analytics"
                    ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {orderTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {paymentMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {dateFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {dateFilter === "custom" && (
            <>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-gray-500 dark:text-gray-400">to</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Orders
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {orders.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                PKR {getTotalRevenue().toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Average Order
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                PKR {getAverageOrderValue().toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Completed
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {ordersByStatus["Completed"]?.count || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Continue in next message */}


      {/* Main Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {viewMode === "card" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <ShoppingBag className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  No orders found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              orders.map((order) => {
                const OrderTypeIcon = orderTypes.find(
                  (t) => t.value === order.order_type
                )?.icon || Coffee;

                return (
                  <div
                    key={order.id}
                    onClick={() => handleOrderSelect(order)}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-r ${getStatusColor(
                            order.order_status
                          )} flex items-center justify-center mr-3`}
                        >
                          <OrderTypeIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">
                            #{order.order_number}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {order.order_type}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                          order.order_status
                        )}`}
                      >
                        {order.order_status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-3">
                      {order.customers && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          {order.customers.first_name} {order.customers.last_name}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(order.order_date).toLocaleDateString()} •{" "}
                        {order.order_time}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                        {order.payment_method} •{" "}
                        <span
                          className={`ml-1 ${
                            order.payment_status === "Paid"
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          {order.payment_status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Total Amount
                      </span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        PKR {parseFloat(order.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {viewMode === "table" && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                      >
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            #{order.order_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {order.customers
                              ? `${order.customers.first_name} ${order.customers.last_name}`
                              : "Walk-in"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="capitalize text-sm text-gray-600 dark:text-gray-300">
                            {order.order_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {new Date(order.order_date).toLocaleDateString()}
                          <br />
                          {order.order_time}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {order.payment_method}
                          </div>
                          <div
                            className={`text-xs ${
                              order.payment_status === "Paid"
                                ? "text-green-600"
                                : "text-orange-600"
                            }`}
                          >
                            {order.payment_status}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                              order.order_status
                            )}`}
                          >
                            {order.order_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-white">
                          PKR {parseFloat(order.total_amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleOrderSelect(order)}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-indigo-600" />
                Orders by Status
              </h3>
              <div className="space-y-4">
                {Object.keys(ordersByStatus).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No data available
                  </div>
                ) : (
                  Object.entries(ordersByStatus).map(([status, data]) => {
                    const percentage = (data.count / orders.length) * 100;
                    const StatusIcon =
                      status === "Completed"
                        ? CheckCircle
                        : status === "Cancelled"
                        ? XCircle
                        : Clock;

                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <StatusIcon
                              className={`w-4 h-4 mr-2 ${
                                status === "Completed"
                                  ? "text-green-600"
                                  : status === "Cancelled"
                                  ? "text-red-600"
                                  : "text-blue-600"
                              }`}
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {status}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {data.count} orders
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${getStatusColor(
                              status
                            )}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        {status === "Completed" && data.revenue > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Revenue: PKR {data.revenue.toFixed(2)}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Order Type Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                Orders by Type
              </h3>
              <div className="space-y-4">
                {Object.keys(ordersByType).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No data available
                  </div>
                ) : (
                  Object.entries(ordersByType).map(([type, data]) => {
                    const percentage = (data.count / orders.length) * 100;
                    const TypeIcon = orderTypes.find((t) => t.value === type)
                      ?.icon || Coffee;

                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <TypeIcon className="w-4 h-4 mr-2 text-indigo-600" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                              {type}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {data.count} orders
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        {data.revenue > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Revenue: PKR {data.revenue.toFixed(2)}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Revenue Insights */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Revenue Insights
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-3">
                      <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Total Revenue
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        From completed orders
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    PKR {getTotalRevenue().toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mr-3">
                      <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Average Order Value
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Per completed order
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    PKR {getAverageOrderValue().toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3">
                      <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Completion Rate
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Success percentage
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {orders.length > 0
                      ? (
                          ((ordersByStatus["Completed"]?.count || 0) /
                            orders.length) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-orange-600" />
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Pending Orders
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Requires attention
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {ordersByStatus["Pending"]?.count || 0}
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      In Progress
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Being prepared
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {(ordersByStatus["Preparing"]?.count || 0) +
                      (ordersByStatus["Ready"]?.count || 0)}
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Cancelled
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Not completed
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {ordersByStatus["Cancelled"]?.count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Sidebar - Continue in next message */}


      {/* Order Details Sidebar */}
      <RightSidebar
        isOpen={showOrderSidebar}
        onClose={() => {
          setShowOrderSidebar(false);
          setSelectedOrder(null);
          setOrderItems([]);
        }}
        title={`Order #${selectedOrder?.order_number || ""}`}
        width="w-[600px]"
      >
        {selectedOrder && (
          <div className="flex-1 overflow-y-auto">
            {/* Order Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">#{selectedOrder.order_number}</h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    {new Date(selectedOrder.order_date).toLocaleDateString()} at{" "}
                    {selectedOrder.order_time}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(
                    selectedOrder.order_status
                  )}`}
                >
                  {selectedOrder.order_status}
                </span>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-indigo-100 text-xs">Order Type</p>
                  <p className="font-semibold capitalize">{selectedOrder.order_type}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-indigo-100 text-xs">Payment</p>
                  <p className="font-semibold">{selectedOrder.payment_method}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-indigo-100 text-xs">Total</p>
                  <p className="font-semibold">PKR {selectedOrder.total_amount}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <div className="flex gap-2">
                {selectedOrder.order_status === "Pending" && (
                  <button
                    onClick={() => handleUpdateStatus("Preparing")}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all font-medium"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Start Preparing</span>
                  </button>
                )}

                {selectedOrder.order_status === "Preparing" && (
                  <button
                    onClick={() => handleUpdateStatus("Ready")}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Mark Ready</span>
                  </button>
                )}

                {(selectedOrder.order_status === "Ready" ||
                  selectedOrder.order_status === "Preparing") && (
                  <button
                    onClick={() => handleUpdateStatus("Completed")}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Order</span>
                  </button>
                )}

                {selectedOrder.order_status !== "Cancelled" &&
                  selectedOrder.order_status !== "Completed" && (
                    <button
                      onClick={() => {
                        setSelectedStatus("Cancelled");
                        setShowStatusModal(true);
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-medium"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Information */}
              {selectedOrder.customers && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Customer Information
                  </h3>
                  <div className="space-y-2">
                    <p className="text-blue-800 dark:text-blue-200 font-semibold">
                      {selectedOrder.customers.first_name}{" "}
                      {selectedOrder.customers.last_name}
                    </p>
                    {selectedOrder.customers.phone && (
                      <p className="text-blue-700 dark:text-blue-300 flex items-center text-sm">
                        <Phone className="w-4 h-4 mr-2" />
                        {selectedOrder.customers.phone}
                      </p>
                    )}
                    {selectedOrder.customers.email && (
                      <p className="text-blue-700 dark:text-blue-300 text-sm">
                        {selectedOrder.customers.email}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                  <span className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Order Items
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                    {orderItems.length} items
                  </span>
                </h3>
                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {item.product_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {item.product_name}
                            </h4>
                            {item.variant_name && (
                              <p className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                                Size: {item.variant_name}
                              </p>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Qty: {item.quantity} × PKR {item.final_price}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">
                            PKR {item.total_price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              {selectedOrder.order_instructions && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/30 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-2 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Special Instructions
                  </h3>
                  <p className="text-orange-800 dark:text-orange-200">
                    {selectedOrder.order_instructions}
                  </p>
                </div>
              )}

              {/* Cancellation Reason */}
              {selectedOrder.order_status === "Cancelled" &&
                selectedOrder.cancellation_reason && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Cancellation Reason
                    </h3>
                    <p className="text-red-800 dark:text-red-200">
                      {selectedOrder.cancellation_reason}
                    </p>
                  </div>
                )}

              {/* Payment Summary */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-300 mb-3 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-green-800 dark:text-green-200">
                    <span>Subtotal:</span>
                    <span>PKR {selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-green-700 dark:text-green-300">
                      <span>Discount ({selectedOrder.discount_percentage}%):</span>
                      <span>-PKR {selectedOrder.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-green-900 dark:text-green-100 font-bold text-lg border-t border-green-200 dark:border-green-700/30 pt-2">
                    <span>Total:</span>
                    <span>PKR {selectedOrder.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-3 pt-3 border-t border-green-200 dark:border-green-700/30">
                    <span className="text-green-700 dark:text-green-300">
                      Payment Method:
                    </span>
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      {selectedOrder.payment_method}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">
                      Payment Status:
                    </span>
                    <span
                      className={`font-semibold ${
                        selectedOrder.payment_status === "Paid"
                          ? "text-green-700 dark:text-green-300"
                          : "text-orange-700 dark:text-orange-300"
                      }`}
                    >
                      {selectedOrder.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Meta Info */}
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Cashier:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedOrder.cashiers?.name || "Admin"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Created:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </span>
                </div>
                {selectedOrder.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Last Updated:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedOrder.updated_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </RightSidebar>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-slate-700">
            <div className="p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <div
                  className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-gradient-to-r ${getStatusColor(
                    selectedStatus
                  )}`}
                >
                  {selectedStatus === "Completed" && (
                    <CheckCircle className="w-8 h-8 text-white" />
                  )}
                  {selectedStatus === "Cancelled" && (
                    <XCircle className="w-8 h-8 text-white" />
                  )}
                  {(selectedStatus === "Preparing" ||
                    selectedStatus === "Ready") && (
                    <Clock className="w-8 h-8 text-white" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Update Order Status
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Change status to <strong>{selectedStatus}</strong> for order #
                  {selectedOrder?.order_number}
                </p>
              </div>

              {/* Cancellation Reason */}
              {selectedStatus === "Cancelled" && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Cancellation Reason *
                  </label>
                  <div className="space-y-2">
                    {cancellationReasons.map((reason) => (
                      <label
                        key={reason}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                          cancelReason === reason
                            ? "bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700/50"
                            : "bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="cancelReason"
                          value={reason}
                          checked={cancelReason === reason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="mr-3"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {reason}
                        </span>
                      </label>
                    ))}
                  </div>

                  {cancelReason === "Other" && (
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Enter custom reason..."
                      className="mt-3 w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 resize-none"
                      rows="3"
                    />
                  )}
                </div>
              )}

              {/* Confirmation Message */}
              {selectedStatus !== "Cancelled" && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {selectedStatus === "Preparing" &&
                      "Order will be marked as being prepared. Kitchen will be notified."}
                    {selectedStatus === "Ready" &&
                      "Order will be marked as ready for pickup/delivery."}
                    {selectedStatus === "Completed" &&
                      "Order will be marked as completed. This action confirms the order is fulfilled."}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedStatus("");
                    setCancelReason("");
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedStatus)}
                  disabled={
                    selectedStatus === "Cancelled" && !cancelReason
                  }
                  className={`flex-1 px-6 py-3 bg-gradient-to-r ${getStatusColor(
                    selectedStatus
                  )} text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}