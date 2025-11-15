"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import {
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Receipt,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Clock,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Coffee,
  Truck,
  Eye,
  Phone,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminReportsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Filters
  const [dateRange, setDateRange] = useState("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Data
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salesData, setSalesData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalCustomers: 0,
    topProducts: [],
    ordersByType: [],
    paymentMethods: [],
    dailyTrends: [],
  });
  const [expenseData, setExpenseData] = useState({
    totalExpenses: 0,
    expensesByCategory: [],
    dailyExpenses: [],
  });
  const [profitData, setProfitData] = useState({
    netProfit: 0,
    profitMargin: 0,
    dailyProfitLoss: [],
  });

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "profit-loss", label: "Profit & Loss", icon: TrendingUp },
    { id: "expenses", label: "Expenses", icon: Receipt },
    { id: "detailed", label: "Detailed", icon: Eye },
  ];

  const dateRangeOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last7days", label: "Last 7 Days" },
    { value: "last30days", label: "Last 30 Days" },
    { value: "thisMonth", label: "This Month" },
    { value: "lastMonth", label: "Last Month" },
    { value: "custom", label: "Custom Range" },
  ];

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (user) {
      updateDateRange(dateRange);
    }
  }, [user, dateRange]);

  useEffect(() => {
    if (user && dateFrom && dateTo) {
      fetchReportsData();
    }
  }, [user, dateFrom, dateTo, orderTypeFilter, statusFilter]);

  const initializePage = async () => {
    try {
      const userData = await getUser();
      if (!userData) {
        window.location.href = "/";
        return;
      }
      setUser(userData);
      setDateRange("today");
    } catch (error) {
      console.error("Error initializing:", error);
      toast.error("Error loading page");
    } finally {
      setLoading(false);
    }
  };

  const updateDateRange = (range) => {
    const today = new Date();
    let from, to;

    switch (range) {
      case "today":
        from = to = today.toISOString().split("T")[0];
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        from = to = yesterday.toISOString().split("T")[0];
        break;
      case "last7days":
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6);
        from = last7.toISOString().split("T")[0];
        to = today.toISOString().split("T")[0];
        break;
      case "last30days":
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 29);
        from = last30.toISOString().split("T")[0];
        to = today.toISOString().split("T")[0];
        break;
      case "thisMonth":
        from = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        to = today.toISOString().split("T")[0];
        break;
      case "lastMonth":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = lastMonth.toISOString().split("T")[0];
        to = new Date(today.getFullYear(), today.getMonth(), 0)
          .toISOString()
          .split("T")[0];
        break;
      case "custom":
        // Don't update dates for custom range
        return;
      default:
        from = to = today.toISOString().split("T")[0];
    }

    setDateFrom(from);
    setDateTo(to);
  };

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [ordersResult, expensesResult] = await Promise.all([
        fetchOrders(),
        fetchExpenses()
      ]);

      // Process data after both are fetched
      const processedSales = processSalesData(ordersResult || []);
      const processedExpenses = processExpenseData(expensesResult || []);
      
      // Calculate profit data after both are processed
      calculateProfitData(processedSales, processedExpenses);
    } catch (error) {
      console.error("Error fetching reports data:", error);
      toast.error("Error loading reports");
    } finally {
      setLoading(false);
    }
  };

 const fetchOrders = async () => {
    try {
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          customers (id, full_name, phone),
          order_items (id, product_name, variant_name, quantity, final_price, total_price)
        `
        )
        .eq("user_id", user.id)
        .gte("order_date", dateFrom)
        .lte("order_date", dateTo)
        .order("created_at", { ascending: false });

      if (orderTypeFilter !== "all") {
        query = query.eq("order_type", orderTypeFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("order_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      console.log("Fetched orders:", data?.length || 0, data);
      setOrders(data || []);
      return data || [];
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error loading orders");
      return [];
    }
  };
  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select(
          `
          *,
          expense_categories (id, name)
        `
        )
        .eq("user_id", user.id)
        .gte("expense_date", dateFrom)
        .lte("expense_date", dateTo)
        .order("expense_date", { ascending: false });

      if (error) throw error;

      console.log("Fetched expenses:", data?.length || 0, data);
      setExpenses(data || []);
      return data || [];
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Error loading expenses");
      return [];
    }
  };

  const processSalesData = (ordersData) => {
    // Only count completed orders for revenue
    const completedOrders = ordersData.filter((o) => o.order_status === "Completed");

    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + parseFloat(o.total_amount || 0),
      0
    );
    const totalOrders = ordersData.length; // Count all orders
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    const uniqueCustomers = new Set(
      ordersData.filter((o) => o.customer_id).map((o) => o.customer_id)
    ).size;

    // Top products - only from completed orders
    const productMap = new Map();
    completedOrders.forEach((order) => {
      order.order_items?.forEach((item) => {
        const key = `${item.product_name}${
          item.variant_name ? ` (${item.variant_name})` : ""
        }`;
        if (!productMap.has(key)) {
          productMap.set(key, { name: key, quantity: 0, revenue: 0 });
        }
        const product = productMap.get(key);
        product.quantity += item.quantity;
        product.revenue += parseFloat(item.total_price || 0);
      });
    });
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Orders by type - all orders
    const ordersByType = [
      {
        name: "Walk-in",
        value: ordersData.filter((o) => o.order_type === "walkin").length,
      },
      {
        name: "Takeaway",
        value: ordersData.filter((o) => o.order_type === "takeaway").length,
      },
      {
        name: "Delivery",
        value: ordersData.filter((o) => o.order_type === "delivery").length,
      },
    ].filter((type) => type.value > 0);

    // Payment methods - only completed orders
    const paymentMap = new Map();
    completedOrders.forEach((order) => {
      const method = order.payment_method;
      if (!paymentMap.has(method)) {
        paymentMap.set(method, { name: method, value: 0, revenue: 0 });
      }
      const payment = paymentMap.get(method);
      payment.value += 1;
      payment.revenue += parseFloat(order.total_amount || 0);
    });
    const paymentMethods = Array.from(paymentMap.values());

    // Daily trends - only completed orders
    const dailyMap = new Map();
    completedOrders.forEach((order) => {
      const date = order.order_date;
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, orders: 0, revenue: 0 });
      }
      const dayData = dailyMap.get(date);
      dayData.orders += 1;
      dayData.revenue += parseFloat(order.total_amount || 0);
    });
    const dailyTrends = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const processedData = {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalCustomers: uniqueCustomers,
      topProducts,
      ordersByType,
      paymentMethods,
      dailyTrends,
    };

    console.log("Processed sales data:", processedData);
    setSalesData(processedData);
    return processedData;
  };

  const processExpenseData = (expensesData) => {
    const totalExpenses = expensesData.reduce(
      (sum, e) => sum + parseFloat(e.total_amount || e.amount || 0),
      0
    );

    // Expenses by category
    const categoryMap = new Map();
    expensesData.forEach((expense) => {
      const categoryName = expense.expense_categories?.name || "Uncategorized";
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { name: categoryName, value: 0 });
      }
      const category = categoryMap.get(categoryName);
      category.value += parseFloat(expense.total_amount || expense.amount || 0);
    });
    const expensesByCategory = Array.from(categoryMap.values()).sort(
      (a, b) => b.value - a.value
    );

    // Daily expenses
    const dailyMap = new Map();
    expensesData.forEach((expense) => {
      const date = expense.expense_date;
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, amount: 0 });
      }
      const dayData = dailyMap.get(date);
      dayData.amount += parseFloat(expense.total_amount || expense.amount || 0);
    });
    const dailyExpenses = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const processedData = {
      totalExpenses,
      expensesByCategory,
      dailyExpenses,
    };

    console.log("Processed expense data:", processedData);
    setExpenseData(processedData);
    return processedData;
  };

  const calculateProfitData = (sales, expenses) => {
    const netProfit = sales.totalRevenue - expenses.totalExpenses;
    const profitMargin =
      sales.totalRevenue > 0 ? (netProfit / sales.totalRevenue) * 100 : 0;

    // Daily profit/loss
    const allDates = new Set([
      ...sales.dailyTrends.map((d) => d.date),
      ...expenses.dailyExpenses.map((d) => d.date),
    ]);

    const dailyProfitLoss = Array.from(allDates)
      .sort()
      .map((date) => {
        const revenue =
          sales.dailyTrends.find((d) => d.date === date)?.revenue || 0;
        const expenseAmount =
          expenses.dailyExpenses.find((d) => d.date === date)?.amount || 0;
        const profit = revenue - expenseAmount;

        return {
          date,
          revenue,
          expenses: expenseAmount,
          profit,
        };
      });

    const calculatedData = {
      netProfit,
      profitMargin,
      dailyProfitLoss,
    };

    console.log("Calculated profit data:", calculatedData);
    setProfitData(calculatedData);
  };

  const formatCurrency = (amount) => {
    return `PKR ${parseFloat(amount || 0).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const exportToCSV = () => {
    if (orders.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvData = orders.map((order) => ({
      "Order Number": order.order_number,
      Date: order.order_date,
      Customer: order.customers
        ? `${order.customers.first_name} ${order.customers.last_name}`
        : "Walk-in",
      Type: order.order_type,
      Status: order.order_status,
      "Payment Method": order.payment_method,
      Total: order.total_amount,
    }));

    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map((row) =>
        Object.values(row)
          .map((val) => `"${val}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    toast.success("Report exported successfully!");
  };

  const handleRefresh = () => {
    fetchReportsData();
    toast.success("Reports refreshed!");
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
            <p className="text-sm text-gray-500 mt-1">
              Complete financial insights and analytics
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>

            <button
              onClick={exportToCSV}
              disabled={orders.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {dateRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {dateRange === "custom" && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </>
          )}

          <select
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="walkin">Walk-in</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Preparing">Preparing</option>
            <option value="Ready">Ready</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(salesData.totalRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(expenseData.totalExpenses)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Receipt className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Net Profit</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  profitData.netProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(profitData.netProfit)}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                profitData.netProfit >= 0 ? "bg-blue-100" : "bg-orange-100"
              }`}
            >
              {profitData.netProfit >= 0 ? (
                <TrendingUp className="w-6 h-6 text-blue-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-orange-600" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Profit Margin</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {profitData.profitMargin.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Orders */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Total Orders</h3>
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{salesData.totalOrders}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Avg: {formatCurrency(salesData.averageOrderValue)}
                </p>
              </div>

              {/* Customers */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Customers</h3>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{salesData.totalCustomers}</p>
                <p className="text-sm text-gray-500 mt-2">Unique customers</p>
              </div>

              {/* Order Status */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Order Status</h3>
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-semibold text-green-600">
                      {orders.filter(o => o.order_status === 'Completed').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pending:</span>
                    <span className="font-semibold text-orange-600">
                      {orders.filter(o => o.order_status === 'Pending').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-green-600" />
                Top Selling Products
              </h3>
              {salesData.topProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No product data available</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Data will appear once you have completed orders
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesData.topProducts.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-sm mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.quantity} sold</p>
                        </div>
                      </div>
                      <p className="font-bold text-gray-900">{formatCurrency(product.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                Payment Methods
              </h3>
              {salesData.paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No payment data available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesData.paymentMethods.map((method, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-900">{method.name}</span>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(method.revenue)}
                        </p>
                        <p className="text-xs text-gray-500">{method.value} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "profit-loss" && (
          <div className="space-y-6">
            {/* Profit Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Net Profit/Loss</h3>
                  {profitData.netProfit >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <p
                  className={`text-3xl font-bold ${
                    profitData.netProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(profitData.netProfit)}
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Profit Margin</h3>
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {profitData.profitMargin.toFixed(2)}%
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Revenue:Expense Ratio</h3>
                  <PieChart className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {expenseData.totalExpenses > 0
                    ? (salesData.totalRevenue / expenseData.totalExpenses).toFixed(1)
                    : "∞"}
                  :1
                </p>
              </div>
            </div>

            {/* Profit/Loss Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Daily Profit & Loss Summary
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Expenses
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Net Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {profitData.dailyProfitLoss.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                          No profit/loss data available for selected period
                        </td>
                      </tr>
                    ) : (
                      profitData.dailyProfitLoss.map((day, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {new Date(day.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                            {formatCurrency(day.revenue)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-red-600">
                            {formatCurrency(day.expenses)}
                          </td>
                          <td
                            className={`px-6 py-4 text-sm text-right font-bold ${
                              day.profit >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatCurrency(day.profit)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "expenses" && (
          <div className="space-y-6">
            {/* Expense Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
                  <Receipt className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(expenseData.totalExpenses)}
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Avg Daily Expense</h3>
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(
                    expenseData.dailyExpenses.length > 0
                      ? expenseData.totalExpenses / expenseData.dailyExpenses.length
                      : 0
                  )}
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Categories</h3>
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {expenseData.expensesByCategory.length}
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-500">Expense to Revenue</h3>
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {salesData.totalRevenue > 0
                    ? ((expenseData.totalExpenses / salesData.totalRevenue) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>

            {/* Expenses by Category */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-red-600" />
                Expenses by Category
              </h3>
              {expenseData.expensesByCategory.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No expense data available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenseData.expensesByCategory.map((category, index) => {
                    const percentage =
                      (category.value / expenseData.totalExpenses) * 100;
                    return (
                      <div key={index}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {category.name}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(category.value)} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Daily Expenses */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Daily Expenses Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenseData.dailyExpenses.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="px-6 py-12 text-center text-gray-500">
                          No expenses recorded for selected period
                        </td>
                      </tr>
                    ) : (
                      expenseData.dailyExpenses.map((day, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {new Date(day.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-red-600">
                            {formatCurrency(day.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "detailed" && (
          <div className="space-y-6">
            {/* Recent Transactions Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                <span className="text-sm text-gray-500">
                  Showing latest {orders.length + expenses.length} transactions
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Method
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.length === 0 && expenses.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No transactions found</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Transactions will appear here once you have orders and expenses
                          </p>
                        </td>
                      </tr>
                    ) : (
                      [
                        ...orders.slice(0, 10).map((order) => ({
                          type: "Sale",
                          typeColor: "bg-green-100 text-green-800",
                          id: order.order_number,
                          date: order.order_date,
                          description: `${order.order_type} order - ${order.order_status}`,
                          method: order.payment_method,
                          amount: order.total_amount,
                          isPositive: order.order_status === "Completed",
                        })),
                        ...expenses.slice(0, 10).map((expense) => ({
                          type: "Expense",
                          typeColor: "bg-red-100 text-red-800",
                          id: `EXP-${expense.id.slice(-6)}`,
                          date: expense.expense_date,
                          description:
                            expense.description ||
                            expense.expense_categories?.name ||
                            "Expense",
                          method: expense.payment_method || "N/A",
                          amount: expense.total_amount || expense.amount,
                          isPositive: false,
                        })),
                      ]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .slice(0, 20)
                        .map((transaction, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${transaction.typeColor}`}
                              >
                                {transaction.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                              {transaction.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(transaction.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {transaction.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.method}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                                transaction.isPositive ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {transaction.isPositive ? "+" : "-"}
                              {formatCurrency(transaction.amount)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Orders Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Orders:</span>
                    <span className="font-bold text-gray-900">{salesData.totalOrders}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Order Value:</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(salesData.averageOrderValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Unique Customers:</span>
                    <span className="font-bold text-gray-900">{salesData.totalCustomers}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Revenue Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Revenue:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(salesData.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Expenses:</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(expenseData.totalExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Net Profit:</span>
                    <span
                      className={`font-bold ${
                        profitData.netProfit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(profitData.netProfit)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Performance Metrics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Profit Margin:</span>
                    <span className="font-bold text-gray-900">
                      {profitData.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Revenue:Expense:</span>
                    <span className="font-bold text-gray-900">
                      {expenseData.totalExpenses > 0
                        ? (salesData.totalRevenue / expenseData.totalExpenses).toFixed(1)
                        : "∞"}
                      :1
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Categories:</span>
                    <span className="font-bold text-gray-900">
                      {expenseData.expensesByCategory.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}