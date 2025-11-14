"use client";
import Sidebar from "./Sidebar";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { LogOut, User, Bell, Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({ children, user }) {
  const router = useRouter();
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchNotificationCount();
    
    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications-count')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications' 
        }, 
        () => {
          fetchNotificationCount();
        }
      )
      .subscribe();

    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  const fetchNotificationCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) throw error;
      setNotificationCount(count || 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const handleNotificationClick = () => {
    router.push("/admin/notifications");
  };

  // Format date and time
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Date and Time Display */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-sm font-medium">{formatDate(currentTime)}</p>
                </div>
              </div>
              
              <div className="h-6 w-px bg-gray-200 dark:bg-slate-700"></div>
              
              <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-sm font-medium tabular-nums">{formatTime(currentTime)}</p>
                </div>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-3">
              {/* Notifications Bell */}
              <button
                onClick={handleNotificationClick}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>

              {/* User Profile */}
              <div className="flex items-center space-x-3 pl-3 border-l border-gray-200 dark:border-slate-700">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.customer_name || "Admin User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.store_name || "Restaurant Manager"}
                  </p>
                </div>
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
}