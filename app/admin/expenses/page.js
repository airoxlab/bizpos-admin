// app/admin/expenses/page.js - FIXED VERSION
"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import {
  Plus,
  Search,
  Calendar,
  DollarSign,
  Receipt,
  Edit2,
  Trash2,
  Download,
  TrendingUp,
  TrendingDown,
  Building,
  Smartphone,
  Clock,
  X,
  Save,
  FileText,
  PieChart,
  BarChart3,
  Tag,
  Package,
  Zap,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import RightSidebar from "@/components/ui/RightSidebar";

export default function AdminExpensesPage() {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [viewMode, setViewMode] = useState("card");

  // Sidebar states
  const [showExpenseSidebar, setShowExpenseSidebar] = useState(false);
  const [showCategorySidebar, setShowCategorySidebar] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Form data
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    categoryId: "",
    subcategoryId: "",
    description: "",
    paymentMethod: "",
    taxRate: 0,
    expenseDate: new Date().toISOString().split("T")[0],
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    icon: "Package",
    color: "#8B5CF6",
    subcategories: [""],
  });

  const paymentMethods = [
    {
      id: "Cash",
      name: "Cash",
      icon: DollarSign,
      color: "from-green-500 to-green-600",
    },
    {
      id: "EasyPaisa",
      name: "EasyPaisa",
      icon: Smartphone,
      color: "from-green-600 to-green-700",
    },
    {
      id: "JazzCash",
      name: "JazzCash",
      icon: Smartphone,
      color: "from-orange-500 to-red-600",
    },
    {
      id: "Bank",
      name: "Bank Transfer",
      icon: Building,
      color: "from-blue-500 to-indigo-600",
    },
    {
      id: "Unpaid",
      name: "Unpaid",
      icon: Clock,
      color: "from-gray-500 to-gray-600",
    },
  ];

  const dateFilterOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "last_week", label: "Last Week" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "this_year", label: "This Year" },
    { value: "custom", label: "Custom Range" },
  ];

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [
    user,
    dateFilter,
    categoryFilter,
    paymentFilter,
    customDateFrom,
    customDateTo,
    sortBy,
  ]);

  const initializePage = async () => {
    try {
      const userData = await getUser();
      if (!userData) {
        window.location.href = "/";
        return;
      }
      setUser(userData);
      
      // Wait for user to be set before fetching categories
      await fetchCategoriesWithUser(userData);
      await fetchSubcategoriesWithUser(userData);
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
      case "last_week":
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        from = lastWeekStart.toISOString().split("T")[0];
        to = lastWeekEnd.toISOString().split("T")[0];
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
      case "this_year":
        from = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0];
        to = today.toISOString().split("T")[0];
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

  const fetchExpenses = async () => {
    if (!user) return;
    
    try {
      const { from, to } = getDateRange();
      let query = supabase
        .from("expenses")
        .select(
          `
          *,
          expense_categories (
            id,
            name,
            icon,
            color
          ),
          expense_subcategories (
            id,
            name
          )
        `
        )
        .eq("user_id", user.id);

      if (from) query = query.gte("expense_date", from);
      if (to) query = query.lte("expense_date", to);
      if (categoryFilter !== "all") query = query.eq("category_id", categoryFilter);
      if (paymentFilter !== "all")
        query = query.eq("payment_method", paymentFilter);

      // Sorting
      const [field, direction] = sortBy.split("_");
      if (field === "date") {
        query = query.order("expense_date", { ascending: direction === "asc" });
      } else if (field === "amount") {
        query = query.order("total_amount", { ascending: direction === "asc" });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Client-side search filter
      let filteredData = data || [];
      if (searchTerm) {
        filteredData = filteredData.filter(
          (expense) =>
            expense.description
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            expense.expense_categories?.name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            expense.expense_subcategories?.name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())
        );
      }

      setExpenses(filteredData);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Error loading expenses");
    }
  };

  const fetchCategoriesWithUser = async (userData) => {
    try {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("user_id", userData.id)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCategories = async () => {
    if (!user) return;
    await fetchCategoriesWithUser(user);
  };

  const fetchSubcategoriesWithUser = async (userData) => {
    try {
      const { data, error } = await supabase
        .from("expense_subcategories")
        .select("*")
        .eq("user_id", userData.id)
        .order("name");

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    }
  };

  const fetchSubcategories = async () => {
    if (!user) return;
    await fetchSubcategoriesWithUser(user);
  };

  const handleSaveExpense = async () => {
    const saveToast = toast.loading("Saving expense...");

    try {
      if (
        !expenseForm.amount ||
        !expenseForm.categoryId ||
        !expenseForm.paymentMethod
      ) {
        toast.error("Please fill in all required fields", { id: saveToast });
        return;
      }

      const amount = parseFloat(expenseForm.amount);
      const taxAmount = (amount * expenseForm.taxRate) / 100;
      const totalAmount = amount + taxAmount;

      const expenseData = {
        user_id: user.id,
        amount: amount,
        category_id: expenseForm.categoryId,
        subcategory_id: expenseForm.subcategoryId || null,
        description: expenseForm.description,
        payment_method: expenseForm.paymentMethod,
        tax_rate: expenseForm.taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        expense_date: expenseForm.expenseDate,
        expense_time: new Date().toTimeString().split(" ")[0],
      };

      if (editingExpense) {
        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editingExpense.id);

        if (error) throw error;
        toast.success("Expense updated successfully!", { id: saveToast });
      } else {
        const { error } = await supabase.from("expenses").insert(expenseData);

        if (error) throw error;
        toast.success("Expense created successfully!", { id: saveToast });
      }

      setShowExpenseSidebar(false);
      setEditingExpense(null);
      resetExpenseForm();
      fetchExpenses();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Failed to save expense: " + error.message, { id: saveToast });
    }
  };

  const handleDeleteExpense = (expense) => {
    toast(
      (t) => (
        <div className="flex flex-col space-y-3">
          <p className="font-medium  text-white-900">
            Delete expense of PKR {expense.total_amount}?
          </p>
          <p className="text-sm text-white-600">
            This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const { error } = await supabase
                    .from("expenses")
                    .delete()
                    .eq("id", expense.id);

                  if (error) throw error;
                  toast.success("Expense deleted successfully", { id: t.id });
                  fetchExpenses();
                } catch (error) {
                  console.error("Error deleting expense:", error);
                  toast.error("Failed to delete expense", { id: t.id });
                }
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
      ),
      {
        duration: 10000,
        position: "top-center",
      }
    );
  };

  const handleSaveCategory = async () => {
    const saveToast = toast.loading("Saving category...");

    try {
      if (!categoryForm.name) {
        toast.error("Category name is required", { id: saveToast });
        return;
      }

      // Save category
      const { data: category, error: categoryError } = await supabase
        .from("expense_categories")
        .insert({
          user_id: user.id,
          name: categoryForm.name,
          description: categoryForm.description,
          icon: categoryForm.icon,
          color: categoryForm.color,
        })
        .select()
        .single();

      if (categoryError) throw categoryError;

      // Save subcategories
      const validSubcats = categoryForm.subcategories.filter((s) => s.trim());
      if (validSubcats.length > 0) {
        const subcatData = validSubcats.map((subcat) => ({
          user_id: user.id,
          category_id: category.id,
          name: subcat.trim(),
        }));

        const { error: subcatError } = await supabase
          .from("expense_subcategories")
          .insert(subcatData);

        if (subcatError) throw subcatError;
      }

      toast.success("Category created successfully!", { id: saveToast });
      setShowCategorySidebar(false);
      setCategoryForm({
        name: "",
        description: "",
        icon: "Package",
        color: "#8B5CF6",
        subcategories: [""],
      });
      fetchCategories();
      fetchSubcategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category: " + error.message, { id: saveToast });
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      amount: "",
      categoryId: "",
      subcategoryId: "",
      description: "",
      paymentMethod: "",
      taxRate: 0,
      expenseDate: new Date().toISOString().split("T")[0],
    });
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      amount: expense.amount.toString(),
      categoryId: expense.category_id,
      subcategoryId: expense.subcategory_id || "",
      description: expense.description || "",
      paymentMethod: expense.payment_method,
      taxRate: expense.tax_rate || 0,
      expenseDate: expense.expense_date,
    });
    setShowExpenseSidebar(true);
  };

  const exportToCSV = () => {
    if (expenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }

    const csvData = expenses.map((expense) => ({
      Date: expense.expense_date,
      Time: expense.expense_time,
      Category: expense.expense_categories?.name || "N/A",
      Subcategory: expense.expense_subcategories?.name || "N/A",
      Description: expense.description || "N/A",
      Amount: expense.amount,
      Tax: expense.tax_amount || 0,
      Total: expense.total_amount,
      "Payment Method": expense.payment_method,
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
    a.download = `expenses_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Expenses exported successfully!");
  };

  // Analytics calculations
  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.total_amount), 0);
  };

  const getAverageExpense = () => {
    return expenses.length > 0 ? getTotalExpenses() / expenses.length : 0;
  };

  const getCategoryBreakdown = () => {
    const breakdown = {};
    expenses.forEach((expense) => {
      const categoryName =
        expense.expense_categories?.name || "Uncategorized";
      if (!breakdown[categoryName]) {
        breakdown[categoryName] = {
          total: 0,
          count: 0,
          color: expense.expense_categories?.color || "#8B5CF6",
        };
      }
      breakdown[categoryName].total += parseFloat(expense.total_amount);
      breakdown[categoryName].count += 1;
    });
    return breakdown;
  };

  const getPaymentMethodBreakdown = () => {
    const breakdown = {};
    expenses.forEach((expense) => {
      const method = expense.payment_method;
      if (!breakdown[method]) {
        breakdown[method] = 0;
      }
      breakdown[method] += parseFloat(expense.total_amount);
    });
    return breakdown;
  };

  const calculateTotalAmount = () => {
    const amount = parseFloat(expenseForm.amount) || 0;
    const taxAmount = (amount * expenseForm.taxRate) / 100;
    return amount + taxAmount;
  };

  const categoryBreakdown = getCategoryBreakdown();
  const paymentBreakdown = getPaymentMethodBreakdown();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading expenses...</p>
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
              Expense Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track and analyze business expenses
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={exportToCSV}
              disabled={expenses.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setShowCategorySidebar(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Categories</span>
            </button>

            <button
              onClick={() => {
                setEditingExpense(null);
                resetExpenseForm();
                setShowExpenseSidebar(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

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

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Payments</option>
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>

          <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "card"
                  ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <Receipt className="w-4 h-4" />
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

      {/* Stats Cards */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Expenses
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                PKR {getTotalExpenses().toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Average Expense
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                PKR {getAverageExpense().toFixed(2)}
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
                Total Count
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {expenses.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
              <Receipt className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Categories
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {Object.keys(categoryBreakdown).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
              <Tag className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Continue in next message due to length... */}


      {/* Main Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {viewMode === "card" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {expenses.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <Receipt className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  No expenses found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Add your first expense to get started
                </p>
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    resetExpenseForm();
                    setShowExpenseSidebar(true);
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Add First Expense
                </button>
              </div>
            ) : (
              expenses.map((expense) => {
                const PaymentIcon =
                  paymentMethods.find((p) => p.id === expense.payment_method)
                    ?.icon || DollarSign;
                const paymentColor =
                  paymentMethods.find((p) => p.id === expense.payment_method)
                    ?.color || "from-gray-500 to-gray-600";

                return (
                  <div
                    key={expense.id}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-r ${paymentColor} flex items-center justify-center mr-3`}
                        >
                          <PaymentIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {expense.expense_categories?.name ||
                              "Uncategorized"}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {expense.expense_date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditExpense(expense)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>

                    {expense.expense_subcategories?.name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {expense.expense_subcategories.name}
                      </p>
                    )}

                    {expense.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                        {expense.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {expense.payment_method}
                      </span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        PKR {parseFloat(expense.total_amount).toFixed(2)}
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
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Payment
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
                  {expenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                      >
                        No expenses found
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {expense.expense_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {expense.expense_categories?.name ||
                                "Uncategorized"}
                            </div>
                            {expense.expense_subcategories?.name && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {expense.expense_subcategories.name}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                          {expense.description || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {expense.payment_method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-white">
                          PKR {parseFloat(expense.total_amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => openEditExpense(expense)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
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
            {/* Category Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-indigo-600" />
                Category Breakdown
              </h3>
              <div className="space-y-3">
                {Object.keys(categoryBreakdown).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No data available
                  </div>
                ) : (
                  Object.entries(categoryBreakdown).map(
                    ([category, data], index) => {
                      const percentage =
                        (data.total / getTotalExpenses()) * 100;
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {category}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              PKR {data.total.toFixed(2)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: data.color,
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {data.count} transaction{data.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      );
                    }
                  )
                )}
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Payment Method Breakdown
              </h3>
              <div className="space-y-3">
                {Object.keys(paymentBreakdown).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No data available
                  </div>
                ) : (
                  Object.entries(paymentBreakdown).map(
                    ([method, total], index) => {
                      const percentage = (total / getTotalExpenses()) * 100;
                      const methodConfig = paymentMethods.find(
                        (p) => p.id === method
                      );
                      const MethodIcon = methodConfig?.icon || DollarSign;
                      
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                              <MethodIcon className="w-4 h-4 mr-2 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {method}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              PKR {total.toFixed(2)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full bg-gradient-to-r ${
                                methodConfig?.color || "from-gray-500 to-gray-600"
                              } transition-all`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                Top Expense Categories
              </h3>
              <div className="space-y-4">
                {Object.keys(categoryBreakdown).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No data available
                  </div>
                ) : (
                  Object.entries(categoryBreakdown)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .slice(0, 5)
                    .map(([category, data], index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                            style={{ backgroundColor: data.color + "20" }}
                          >
                            <span
                              className="text-lg font-bold"
                              style={{ color: data.color }}
                            >
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {category}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {data.count} transaction{data.count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          PKR {data.total.toFixed(2)}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                Quick Insights
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3">
                      <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Total Transactions
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        In selected period
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {expenses.length}
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-3">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Highest Expense
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Single transaction
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    PKR{" "}
                    {expenses.length > 0
                      ? Math.max(
                          ...expenses.map((e) => parseFloat(e.total_amount))
                        ).toFixed(2)
                      : "0.00"}
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center mr-3">
                      <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Lowest Expense
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Single transaction
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    PKR{" "}
                    {expenses.length > 0
                      ? Math.min(
                          ...expenses.map((e) => parseFloat(e.total_amount))
                        ).toFixed(2)
                      : "0.00"}
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mr-3">
                      <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Average per Day
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Based on date range
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    PKR{" "}
                    {expenses.length > 0
                      ? (
                          getTotalExpenses() /
                          Math.max(
                            1,
                            new Set(expenses.map((e) => e.expense_date)).size
                          )
                        ).toFixed(2)
                      : "0.00"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Expense Sidebar */}
      <RightSidebar
        isOpen={showExpenseSidebar}
        onClose={() => {
          setShowExpenseSidebar(false);
          setEditingExpense(null);
          resetExpenseForm();
        }}
        title={editingExpense ? "Edit Expense" : "Add New Expense"}
        width="w-[500px]"
      >
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount (PKR) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, amount: e.target.value })
                }
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-semibold"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              value={expenseForm.categoryId}
              onChange={(e) =>
                setExpenseForm({
                  ...expenseForm,
                  categoryId: e.target.value,
                  subcategoryId: "",
                })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          {expenseForm.categoryId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subcategory
              </label>
              <select
                value={expenseForm.subcategoryId}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    subcategoryId: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select Subcategory (Optional)</option>
                {subcategories
                  .filter((sub) => sub.category_id === expenseForm.categoryId)
                  .map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const MethodIcon = method.icon;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() =>
                      setExpenseForm({
                        ...expenseForm,
                        paymentMethod: method.id,
                      })
                    }
                    className={`p-4 rounded-lg border-2 transition-all ${
                      expenseForm.paymentMethod === method.id
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 bg-gradient-to-r ${method.color} rounded-lg flex items-center justify-center mb-2`}
                      >
                        <MethodIcon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {method.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tax Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tax Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={expenseForm.taxRate}
              onChange={(e) =>
                setExpenseForm({
                  ...expenseForm,
                  taxRate: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          {/* Total Calculation */}
          {expenseForm.amount && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                Total Calculation
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Base Amount:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    PKR {parseFloat(expenseForm.amount || 0).toFixed(2)}
                  </span>
                </div>
                {expenseForm.taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Tax ({expenseForm.taxRate}%):
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      PKR{" "}
                      {(
                        (parseFloat(expenseForm.amount || 0) *
                          expenseForm.taxRate) /
                        100
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-green-900 dark:text-green-300 border-t border-green-200 dark:border-green-700 pt-1 mt-1">
                  <span>Total:</span>
                  <span>PKR {calculateTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expense Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={expenseForm.expenseDate}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    expenseDate: e.target.value,
                  })
                }
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={expenseForm.description}
              onChange={(e) =>
                setExpenseForm({
                  ...expenseForm,
                  description: e.target.value,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows="4"
              placeholder="Enter expense description..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <button
            onClick={handleSaveExpense}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{editingExpense ? "Update" : "Save"} Expense</span>
          </button>
        </div>
      </RightSidebar>

      {/* Category Management Sidebar - Reply "continue" for this final section */}

      {/* Category Management Sidebar */}
      <RightSidebar
        isOpen={showCategorySidebar}
        onClose={() => {
          setShowCategorySidebar(false);
          setCategoryForm({
            name: "",
            description: "",
            icon: "Package",
            color: "#8B5CF6",
            subcategories: [""],
          });
        }}
        title="Manage Categories"
        width="w-[500px]"
      >
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Existing Categories List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Existing Categories ({categories.length})
            </h3>
            <div className="space-y-2 mb-4">
              {categories.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-600">
                  <Tag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No categories yet
                  </p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                          style={{
                            backgroundColor: category.color + "20",
                          }}
                        >
                          <Tag
                            className="w-4 h-4"
                            style={{ color: category.color }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                  <button
  onClick={() => {
    toast(
      (t) => (
        <div className="flex flex-col space-y-4 min-w-[320px]">
          {/* Header with Icon */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">
                Delete "{category.name}"?
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                All expenses in this category will become uncategorized. This
                action cannot be undone.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-2 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          <button
  onClick={async () => {
    try {
      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", category.id);
      if (error) throw error;

      toast.success("Category deleted successfully", {
        id: t.id,
      });
      fetchCategories();
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category", {
        id: t.id,
      });
    }
  }}
  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
>
  Delete Category
</button>

          </div>
        </div>
      ),
      {
        duration: 15000,
        position: "top-center",
        style: {
          background: "var(--toast-bg, #ffffff)",
          color: "var(--toast-color, #111827)",
          border: "1px solid var(--toast-border, #e5e7eb)",
          borderRadius: "0.75rem",
          padding: "1rem",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        },
        className: "dark:bg-slate-800 dark:text-white dark:border-slate-700",
      }
    );
  }}
  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 rounded-lg transition-colors"
  title="Delete category"
>
  <Trash2 className="w-4 h-4" />
</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Create New Category
            </h3>

            {/* Category Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category Name *
              </label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., Office Supplies, Utilities"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows="2"
                placeholder="Optional description"
              />
            </div>

            {/* Color Picker */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, color: e.target.value })
                  }
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-slate-600"
                />
                <input
                  type="text"
                  value={categoryForm.color}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, color: e.target.value })
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="#8B5CF6"
                />
              </div>
              
              {/* Quick Color Presets */}
              <div className="flex items-center space-x-2 mt-2">
                {['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#6366F1', '#14B8A6'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, color })}
                    className="w-8 h-8 rounded-lg border-2 border-gray-300 dark:border-slate-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Subcategories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subcategories
              </label>
              <div className="space-y-2">
                {categoryForm.subcategories.map((subcat, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={subcat}
                      onChange={(e) => {
                        const newSubcats = [...categoryForm.subcategories];
                        newSubcats[index] = e.target.value;
                        setCategoryForm({
                          ...categoryForm,
                          subcategories: newSubcats,
                        });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder={`Subcategory ${index + 1}`}
                    />
                    {categoryForm.subcategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newSubcats = categoryForm.subcategories.filter(
                            (_, i) => i !== index
                          );
                          setCategoryForm({
                            ...categoryForm,
                            subcategories: newSubcats,
                          });
                        }}
                        className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCategoryForm({
                      ...categoryForm,
                      subcategories: [...categoryForm.subcategories, ""],
                    })
                  }
                  className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Subcategory
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <button
            onClick={handleSaveCategory}
            disabled={!categoryForm.name.trim()}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Create Category</span>
          </button>
        </div>
      </RightSidebar>
    </div>
  );
}
