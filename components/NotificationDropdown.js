"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import {
  Bell,
  X,
  Check,
  AlertTriangle,
  Package,
  Clock,
  ExternalLink,
  Trash2,
  CheckCheck
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotificationCount();

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications-dropdown')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('Notification change:', payload);
          fetchNotificationCount();
          if (isOpen) {
            fetchRecentNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotificationCount = async () => {
    try {
      const user = await getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setNotificationCount(count || 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const fetchRecentNotifications = async () => {
    setLoading(true);
    try {
      const user = await getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          inventory_items (
            id,
            name,
            sku,
            current_stock,
            minimum_stock,
            units (abbreviation)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchRecentNotifications();
    }
    setIsOpen(!isOpen);
  };

  const markAsRead = async (notificationId, event) => {
    event.stopPropagation();

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );

      // Refresh count
      fetchNotificationCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async (event) => {
    event.stopPropagation();

    try {
      const user = await getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );

      // Refresh count
      fetchNotificationCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId, event) => {
    event.stopPropagation();

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      // Refresh count
      fetchNotificationCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      default:
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
    }
  };

  const getSeverityIcon = (severity, type) => {
    if (type.includes('stock')) {
      return <Package className="w-5 h-5 text-orange-600" />;
    }
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push('/admin/notifications');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications
              {notificationCount > 0 && (
                <span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                  {notificationCount}
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              {notificationCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center space-x-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors cursor-pointer relative ${
                      !notification.is_read
                        ? getSeverityStyles(notification.severity)
                        : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700'
                    } ${!notification.is_read ? 'border-l-4' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getSeverityIcon(notification.severity, notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="ml-2 w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                          {notification.message}
                        </p>

                        {/* Item Details */}
                        {notification.inventory_items && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                            <Package className="w-3 h-3" />
                            <span>{notification.inventory_items.name}</span>
                            {notification.inventory_items.current_stock !== null && (
                              <>
                                <span>•</span>
                                <span className="font-medium">
                                  {notification.inventory_items.current_stock} {notification.inventory_items.units?.abbreviation || 'units'}
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Time and Actions */}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTimeAgo(notification.created_at)}
                          </div>

                          <div className="flex items-center space-x-1">
                            {!notification.is_read && (
                              <button
                                onClick={(e) => markAsRead(notification.id, e)}
                                className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                              </button>
                            )}
                            <button
                              onClick={(e) => deleteNotification(notification.id, e)}
                              className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={handleViewAll}
              className="w-full flex items-center justify-center space-x-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
