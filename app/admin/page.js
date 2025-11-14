// app/admin/dashboard/page.js - PROFESSIONAL REAL-TIME DASHBOARD
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import {
  Package,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Users,
  AlertTriangle,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Boxes,
  Receipt,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import toast from "react-hot-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalExpenses: 0,
    lowStockItems: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesData, setSalesData] = useState(null);
  const [ordersData, setOrdersData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [orderStatusData, setOrderStatusData] = useState(null);
  const [expensesData, setExpensesData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      const userData = await getUser();
      if (!userData) {
        window.location.href = "/";
        return;
      }
      setUser(userData);
      await fetchAllDashboardData(userData);
    } catch (error) {
      console.error("Error initializing dashboard:", error);
      toast.error("Error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDashboardData = async (userData) => {
    await Promise.all([
      fetchStats(userData),
      fetchRecentOrders(userData),
      fetchSalesData(userData),
      fetchOrdersData(userData),
      fetchCategoryData(userData),
      fetchOrderStatusData(userData),
      fetchExpensesData(userData),
      fetchTopProducts(userData),
    ]);
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await fetchAllDashboardData(user);
      toast.success("Dashboard refreshed!");
    } catch (error) {
      console.error("Error refreshing:", error);
      toast.error("Failed to refresh dashboard");
    } finally {
      setRefreshing(false);
    }
  };

   const getStatusColor = (status) => {
    const colors = {
      Pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      Preparing:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      Ready:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      Completed:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      Cancelled:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };


  const fetchStats = async (userData) => {
    try {
      // Total Products
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.id);

      // Total Revenue (Completed Orders)
      const { data: ordersData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("user_id", userData.id)
        .eq("order_status", "Completed");

      const totalRevenue = ordersData?.reduce(
        (sum, order) => sum + parseFloat(order.total_amount),
        0
      ) || 0;

      // Total Orders
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.id);

      // Total Customers
      const { count: customersCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.id);

      // Total Expenses (This Month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: expensesData } = await supabase
        .from("expenses")
        .select("total_amount")
        .eq("user_id", userData.id)
        .gte("expense_date", startOfMonth.toISOString().split("T")[0]);

      const totalExpenses = expensesData?.reduce(
        (sum, expense) => sum + parseFloat(expense.total_amount),
        0
      ) || 0;

      // Low Stock Items
      const { data: inventoryItems } = await supabase
        .from("inventory_items")
        .select("current_stock, minimum_stock_level")
        .eq("user_id", userData.id);

      const lowStockItems = inventoryItems?.filter(
        (item) => item.current_stock <= (item.minimum_stock_level || 0)
      ).length || 0;

      setStats({
        totalProducts: productsCount || 0,
        totalRevenue,
        totalOrders: ordersCount || 0,
        totalCustomers: customersCount || 0,
        totalExpenses,
        lowStockItems,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

// Replace the fetchRecentOrders function with this:

const fetchRecentOrders = async (userData) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        total_amount,
        order_status,
        order_date,
        order_time,
        customers (
          full_name,
          fullname
        )
      `
      )
      .eq("user_id", userData.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;
    setRecentOrders(data || []);
  } catch (error) {
    console.error("Error fetching recent orders:", error);
  }
};



// Also update the Recent Orders display section:
// Find this part in the JSX and replace the customer name display:

{recentOrders.map((order) => (
  <div
    key={order.id}
    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
  >
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
        <Receipt className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="font-semibold text-gray-900 dark:text-white">
          #{order.order_number}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {order.customers
            ? (order.customers.full_name || order.customers.fullname || "Customer")
            : "Walk-in Customer"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {order.order_date} • {order.order_time}
        </p>
      </div>
    </div>
    <div className="text-right">
      <p className="font-bold text-gray-900 dark:text-white mb-1">
        PKR {parseFloat(order.total_amount).toLocaleString()}
      </p>
      <span
        className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(
          order.order_status
        )}`}
      >
        {order.order_status}
      </span>
    </div>
  </div>
))}

  const fetchSalesData = async (userData) => {
    try {
      const last6Months = [];
      const monthNames = [];
      const salesByMonth = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleString("default", { month: "short" });
        monthNames.push(month);

        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { data } = await supabase
          .from("orders")
          .select("total_amount")
          .eq("user_id", userData.id)
          .eq("order_status", "Completed")
          .gte("order_date", startOfMonth.toISOString().split("T")[0])
          .lte("order_date", endOfMonth.toISOString().split("T")[0]);

        const monthTotal =
          data?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) ||
          0;
        salesByMonth.push(monthTotal);
      }

      setSalesData({
        labels: monthNames,
        datasets: [
          {
            label: "Sales (PKR)",
            data: salesByMonth,
            backgroundColor: "rgba(99, 102, 241, 0.1)",
            borderColor: "rgba(99, 102, 241, 1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching sales data:", error);
    }
  };

  const fetchOrdersData = async (userData) => {
    try {
      const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const ordersByDay = Array(7).fill(0);

      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split("T")[0]);
      }

      const { data } = await supabase
        .from("orders")
        .select("order_date")
        .eq("user_id", userData.id)
        .gte("order_date", last7Days[0])
        .lte("order_date", last7Days[6]);

      data?.forEach((order) => {
        const orderDate = new Date(order.order_date);
        const dayIndex = (orderDate.getDay() + 6) % 7; // Convert to Mon=0, Sun=6
        ordersByDay[dayIndex]++;
      });

      setOrdersData({
        labels: daysOfWeek,
        datasets: [
          {
            label: "Orders",
            data: ordersByDay,
            backgroundColor: "rgba(16, 185, 129, 0.8)",
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 1,
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching orders data:", error);
    }
  };

  const fetchCategoryData = async (userData) => {
    try {
      const { data: categories } = await supabase
        .from("categories")
        .select(
          `
          id,
          name,
          products (id)
        `
        )
        .eq("user_id", userData.id);

      if (!categories || categories.length === 0) {
        setCategoryData(null);
        return;
      }

      const categoryNames = categories.map((cat) => cat.name);
      const productCounts = categories.map((cat) => cat.products?.length || 0);

      const colors = [
        "rgba(99, 102, 241, 0.8)",
        "rgba(16, 185, 129, 0.8)",
        "rgba(245, 158, 11, 0.8)",
        "rgba(239, 68, 68, 0.8)",
        "rgba(139, 92, 246, 0.8)",
        "rgba(236, 72, 153, 0.8)",
      ];

      setCategoryData({
        labels: categoryNames,
        datasets: [
          {
            data: productCounts,
            backgroundColor: colors.slice(0, categoryNames.length),
            borderWidth: 0,
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching category data:", error);
    }
  };

  const fetchOrderStatusData = async (userData) => {
    try {
      const { data } = await supabase
        .from("orders")
        .select("order_status")
        .eq("user_id", userData.id);

      const statusCounts = {};
      data?.forEach((order) => {
        statusCounts[order.order_status] =
          (statusCounts[order.order_status] || 0) + 1;
      });

      const statuses = Object.keys(statusCounts);
      const counts = Object.values(statusCounts);

      const statusColors = {
        Pending: "rgba(245, 158, 11, 0.8)",
        Preparing: "rgba(59, 130, 246, 0.8)",
        Ready: "rgba(139, 92, 246, 0.8)",
        Completed: "rgba(16, 185, 129, 0.8)",
        Cancelled: "rgba(239, 68, 68, 0.8)",
      };

      const colors = statuses.map(
        (status) => statusColors[status] || "rgba(156, 163, 175, 0.8)"
      );

      setOrderStatusData({
        labels: statuses,
        datasets: [
          {
            data: counts,
            backgroundColor: colors,
            borderWidth: 0,
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching order status data:", error);
    }
  };

  const fetchExpensesData = async (userData) => {
    try {
      const last6Months = [];
      const monthNames = [];
      const expensesByMonth = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleString("default", { month: "short" });
        monthNames.push(month);

        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { data } = await supabase
          .from("expenses")
          .select("total_amount")
          .eq("user_id", userData.id)
          .gte("expense_date", startOfMonth.toISOString().split("T")[0])
          .lte("expense_date", endOfMonth.toISOString().split("T")[0]);

        const monthTotal =
          data?.reduce(
            (sum, expense) => sum + parseFloat(expense.total_amount),
            0
          ) || 0;
        expensesByMonth.push(monthTotal);
      }

      setExpensesData({
        labels: monthNames,
        datasets: [
          {
            label: "Expenses (PKR)",
            data: expensesByMonth,
            backgroundColor: "rgba(239, 68, 68, 0.8)",
            borderColor: "rgba(239, 68, 68, 1)",
            borderWidth: 1,
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching expenses data:", error);
    }
  };

  const fetchTopProducts = async (userData) => {
    try {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select(
          `
          product_id,
          quantity,
          total_price,
          products (
            name,
            image_url
          ),
          orders!inner (
            user_id,
            order_status
          )
        `
        )
        .eq("orders.user_id", userData.id)
        .eq("orders.order_status", "Completed");

      const productStats = {};

      orderItems?.forEach((item) => {
        const productId = item.product_id;
        if (!productStats[productId]) {
          productStats[productId] = {
            name: item.products?.name || "Unknown",
            image_url: item.products?.image_url || "",
            totalQuantity: 0,
            totalRevenue: 0,
          };
        }
        productStats[productId].totalQuantity += item.quantity;
        productStats[productId].totalRevenue += parseFloat(item.total_price);
      });

      const topProductsArray = Object.values(productStats)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5);

      setTopProducts(topProductsArray);
    } catch (error) {
      console.error("Error fetching top products:", error);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: function (value) {
            return "₨" + value.toLocaleString();
          },
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 11,
          },
        },
      },
    },
  };

 
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-slate-900 overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Dashboard Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {user?.name || "Admin"}! Here's what's happening with
              your business today.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Total Products
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalProducts}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Total Revenue
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              PKR {stats.totalRevenue.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Total Orders
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalOrders}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Total Customers
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalCustomers}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Monthly Expenses
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              PKR {stats.totalExpenses.toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Low Stock Items
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.lowStockItems}
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                Sales Trend (Last 6 Months)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monthly revenue from completed orders
              </p>
            </div>
            <div className="h-64">
              {salesData ? (
                <Line data={salesData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No sales data available
                </div>
              )}
            </div>
          </div>

          {/* Weekly Orders */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <CalendarDays className="w-5 h-5 mr-2 text-green-600" />
                Weekly Orders
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Orders by day (Last 7 days)
              </p>
            </div>
            <div className="h-64">
              {ordersData ? (
                <Bar data={ordersData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No orders data available
                </div>
              )}
            </div>
          </div>

          {/* Products by Category */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Boxes className="w-5 h-5 mr-2 text-purple-600" />
                Products by Category
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Product distribution across categories
              </p>
            </div>
            <div className="h-64">
              {categoryData ? (
                <Doughnut data={categoryData} options={doughnutOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No categories available
                </div>
              )}
            </div>
          </div>

          {/* Order Status Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Order Status Distribution
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current order statuses
              </p>
            </div>
            <div className="h-64">
              {orderStatusData ? (
                <Doughnut data={orderStatusData} options={doughnutOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No order status data available
                </div>
              )}
            </div>
          </div>

          {/* Monthly Expenses */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-red-600" />
                Monthly Expenses (Last 6 Months)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total expenses per month
              </p>
            </div>
            <div className="h-64">
              {expensesData ? (
                <Bar data={expensesData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No expenses data available
                </div>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-orange-600" />
                Top Selling Products
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Best performers by revenue
              </p>
            </div>
            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No product data available
                </div>
              ) : (
                topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {index + 1}
                        </span>
                      </div>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {product.totalQuantity} sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        PKR {product.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-indigo-600" />
              Recent Orders
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Latest customer orders
            </p>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No recent orders
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        #{order.order_number}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {order.customers
                          ? `${order.customers.first_name} ${order.customers.last_name}`
                          : "Walk-in Customer"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {order.order_date} • {order.order_time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white mb-1">
                      PKR {parseFloat(order.total_amount).toLocaleString()}
                    </p>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(
                        order.order_status
                      )}`}
                    >
                      {order.order_status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}