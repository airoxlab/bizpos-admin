"use client";
import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Trash2,
  Mail,
  Plus,
  X,
  Settings,
  Package,
  Filter,
  Inbox,
  Check,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [emailSettings, setEmailSettings] = useState({
    enabled: false,
    emails: [],
    lowStockAlerts: true,
    expiryAlerts: true,
    expiryDaysBefore: 7
  });
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [filter, setFilter] = useState('all');
  const [settingsId, setSettingsId] = useState(null);

  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    critical: 0,
    warnings: 0
  });
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  useEffect(() => {
    console.log('🚀 Component mounted - Setting up listeners');
    initializeUser();
    
    const notificationChannel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications' 
        }, 
        (payload) => {
          console.log('🔔 NOTIFICATION CHANGE DETECTED:', payload);
          if (payload.eventType === 'INSERT') {
            console.log('➕ NEW notification inserted:', payload.new);
            handleNewNotification(payload.new);
          }
          fetchNotifications();
        }
      )
      .subscribe();

    const inventoryChannel = supabase
      .channel('inventory-realtime')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory_items'
        },
        (payload) => {
          console.log('📦 INVENTORY UPDATED:', payload);
          console.log('  - Item:', payload.new.name);
          console.log('  - Current Stock:', payload.new.current_stock);
          console.log('  - Minimum Stock:', payload.new.minimum_stock);
          checkLowStockAndNotify(payload.new);
        }
      )
      .subscribe();

    console.log('✅ Real-time channels subscribed');

    return () => {
      console.log('🔌 Unsubscribing from channels');
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(inventoryChannel);
    };
  }, []);

  const initializeUser = async () => {
    const user = await getUser();
    if (user) {
      setCurrentUser(user);
      fetchNotifications(user.id);
      fetchEmailSettings(user.id);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications(currentUser.id);
    }
  }, [filter, currentUser]);

  useEffect(() => {
    console.log("Welcome to notification page")
  }, []);

  const fetchNotifications = async (userId) => {
    if (!userId) return;

    // Only show loading spinner on initial page load, not on filter changes
    if (initialLoad) {
      setLoading(true);
    }

    try {
      // Always fetch all notifications for accurate stats
      const { data: allData, error: allError } = await supabase
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
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      // Calculate stats from all notifications
      calculateStats(allData || []);

      // Filter for display
      let filteredData = allData || [];
      if (filter === 'unread') {
        filteredData = filteredData.filter(n => !n.is_read);
      } else if (filter === 'low_stock') {
        filteredData = filteredData.filter(n => ['low_stock', 'critical_stock'].includes(n.type));
      } else if (filter === 'expiry') {
        filteredData = filteredData.filter(n => n.type === 'expiry_alert');
      }

      setNotifications(filteredData);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  };

  const calculateStats = (notifs) => {
    setStats({
      total: notifs.length,
      unread: notifs.filter(n => !n.is_read).length,
      critical: notifs.filter(n => n.severity === 'critical').length,
      warnings: notifs.filter(n => n.severity === 'warning').length
    });
  };

  const checkLowStockAndNotify = async (item) => {
    console.log('📊 checkLowStockAndNotify called');
    console.log('  - Item ID:', item.id);
    console.log('  - Item Name:', item.name);
    console.log('  - Current Stock:', item.current_stock);
    console.log('  - Minimum Stock:', item.minimum_stock);
    
    if (!item || item.current_stock === undefined || item.minimum_stock === undefined) {
      console.log('⏭️ Skipping - missing stock data');
      return;
    }

    const currentStock = parseFloat(item.current_stock);
    const minimumStock = parseFloat(item.minimum_stock);

    console.log('  - Parsed Current:', currentStock);
    console.log('  - Parsed Minimum:', minimumStock);
    console.log('  - Is Low?', currentStock <= minimumStock);

    if (currentStock <= minimumStock) {
      console.log('⚠️ STOCK IS LOW! Checking for existing notification...');
      
      const notifType = currentStock === 0 ? 'critical_stock' : 'low_stock';
      console.log('  - Notification type:', notifType);

      const { data: existingNotif, error: checkError } = await supabase
        .from('notifications')
        .select('id')
        .eq('inventory_item_id', item.id)
        .eq('type', notifType)
        .eq('is_read', false)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.log('❌ Error checking notification:', checkError);
      }

      if (existingNotif) {
        console.log('ℹ️ Notification already exists:', existingNotif.id);
        return;
      }

      console.log('✅ No existing notification - creating new one...');

      const notificationData = {
        type: notifType,
        severity: currentStock === 0 ? 'critical' : 'warning',
        title: currentStock === 0 ? 'Out of Stock!' : 'Low Stock Alert',
        message: currentStock === 0 
          ? `${item.name} is out of stock!`
          : `${item.name} is running low. Current stock: ${currentStock}, Minimum: ${minimumStock}`,
        inventory_item_id: item.id,
        is_read: false
      };

      console.log('📝 Notification data:', notificationData);

      const { data: newNotif, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();

      if (error) {
        console.log('❌ Error creating notification:', error);
      } else {
        console.log('✅ Notification created successfully:', newNotif);
      }
    } else {
      console.log('✅ Stock level is OK - no notification needed');
    }
  };

  const handleNewNotification = async (notification) => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🔔 handleNewNotification TRIGGERED');
    console.log('═══════════════════════════════════════');
    console.log('Notification:', notification);
    
    console.log('📥 Fetching email settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.log('❌ Error fetching settings:', settingsError);
      return;
    }

    console.log('⚙️ Email Settings:', settings);
    console.log('  - Email Enabled:', settings?.email_enabled);
    console.log('  - Email Addresses:', settings?.email_addresses);
    console.log('  - Low Stock Alerts:', settings?.low_stock_alerts);
    console.log('  - Expiry Alerts:', settings?.expiry_alerts);

    if (settings && settings.email_enabled && settings.email_addresses?.length > 0) {
      console.log('✅ Email notifications are enabled');
      
      const shouldSendEmail = 
        (notification.type.includes('stock') && settings.low_stock_alerts) ||
        (notification.type === 'expiry_alert' && settings.expiry_alerts);

      console.log('📊 Should send email?', shouldSendEmail);
      console.log('  - Notification type:', notification.type);
      console.log('  - Type includes "stock":', notification.type.includes('stock'));
      console.log('  - Low stock alerts enabled:', settings.low_stock_alerts);

      if (shouldSendEmail) {
        console.log('📤 SENDING EMAIL NOTIFICATION...');
        await sendEmailNotification(notification, settings.email_addresses);
      } else {
        console.log('⏭️ Skipping email - alert type disabled');
      }
    } else {
      console.log('⏭️ Email notifications not configured properly');
      if (!settings) console.log('  - No settings found');
      if (!settings?.email_enabled) console.log('  - Email not enabled');
      if (!settings?.email_addresses?.length) console.log('  - No email addresses');
    }
    console.log('═══════════════════════════════════════');
    console.log('');
  };

  const sendEmailNotification = async (notification, emails) => {
    console.log('');
    console.log('📧 ════════════════════════════════════');
    console.log('📧 sendEmailNotification STARTED');
    console.log('📧 ════════════════════════════════════');
    console.log('Notification:', notification);
    console.log('Emails:', emails);
    
    try {
      let itemDetails = null;
      if (notification.inventory_item_id) {
        console.log('🔍 Fetching item details...');
        const { data, error } = await supabase
          .from('inventory_items')
          .select('name, sku, current_stock, minimum_stock, units(abbreviation)')
          .eq('id', notification.inventory_item_id)
          .single();
        
        if (error) {
          console.log('❌ Error fetching item:', error);
        } else {
          itemDetails = data;
          console.log('✅ Item details:', itemDetails);
        }
      }

      const payload = {
        emails,
        notification: {
          ...notification,
          item: itemDetails
        }
      };

      console.log('📤 Calling API with payload:', payload);

      const response = await fetch('/api/send-notification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📨 API Response Status:', response.status);
      
      const responseData = await response.json();
      console.log('📨 API Response Data:', responseData);

      if (!response.ok) {
        console.error('❌ Email API returned error:', responseData);
      } else {
        console.log('✅✅✅ EMAIL SENT SUCCESSFULLY! ✅✅✅');
      }
    } catch (error) {
      console.error('❌ ERROR in sendEmailNotification:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    console.log('📧 ════════════════════════════════════');
    console.log('');
  };

  const fetchEmailSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettingsId(data.id);
        setEmailSettings({
          enabled: data.email_enabled,
          emails: data.email_addresses || [],
          lowStockAlerts: data.low_stock_alerts,
          expiryAlerts: data.expiry_alerts,
          expiryDaysBefore: data.expiry_days_before || 7
        });
        console.log('⚙️ Email settings loaded:', {
          enabled: data.email_enabled,
          emails: data.email_addresses,
          lowStockAlerts: data.low_stock_alerts
        });
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      
      const updatedNotifs = notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      );
      calculateStats(updatedNotifs);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      calculateStats(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      const updatedNotifs = notifications.filter(n => n.id !== id);
      setNotifications(updatedNotifs);
      calculateStats(updatedNotifs);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', currentUser.id);

      if (error) throw error;

      setNotifications([]);
      calculateStats([]);
      setShowDeleteAllModal(false);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    
    if (notification.inventory_item_id) {
      router.push(`/admin/inventory?item=${notification.inventory_item_id}`);
    }
  };

  const handleEmailToggle = async () => {
    try {
      const newEnabled = !emailSettings.enabled;
      console.log('🔄 Toggling email notifications:', newEnabled);
      
      const { error } = await supabase
        .from('notification_settings')
        .update({ email_enabled: newEnabled })
        .eq('id', settingsId);

      if (error) throw error;
      
      setEmailSettings(prev => ({ ...prev, enabled: newEnabled }));
      console.log('✅ Email notifications', newEnabled ? 'ENABLED' : 'DISABLED');
    } catch (error) {
      console.error('Error toggling email:', error);
      alert('Error updating settings: ' + error.message);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    if (emailSettings.emails.includes(newEmail)) {
      alert('This email is already added');
      return;
    }

    try {
      const updatedEmails = [...emailSettings.emails, newEmail];
      
      const { error } = await supabase
        .from('notification_settings')
        .update({ email_addresses: updatedEmails })
        .eq('id', settingsId);

      if (error) throw error;
      
      setEmailSettings(prev => ({ ...prev, emails: updatedEmails }));
      setNewEmail('');
      console.log('✅ Email added:', newEmail);
    } catch (error) {
      console.error('Error adding email:', error);
      alert('Error adding email: ' + error.message);
    }
  };

  const handleRemoveEmail = async (emailToRemove) => {
    try {
      const updatedEmails = emailSettings.emails.filter(e => e !== emailToRemove);
      
      const { error } = await supabase
        .from('notification_settings')
        .update({ email_addresses: updatedEmails })
        .eq('id', settingsId);

      if (error) throw error;
      
      setEmailSettings(prev => ({ ...prev, emails: updatedEmails }));
    } catch (error) {
      console.error('Error removing email:', error);
      alert('Error removing email: ' + error.message);
    }
  };

  const handleUpdateAlertSettings = async (field, value) => {
    try {
      const updateData = {};
      
      if (field === 'lowStockAlerts') {
        updateData.low_stock_alerts = value;
      } else if (field === 'expiryAlerts') {
        updateData.expiry_alerts = value;
      } else if (field === 'expiryDaysBefore') {
        updateData.expiry_days_before = parseInt(value);
      }

      const { error } = await supabase
        .from('notification_settings')
        .update(updateData)
        .eq('id', settingsId);

      if (error) throw error;
      
      setEmailSettings(prev => ({ ...prev, [field]: value }));
      console.log('✅ Alert setting updated:', field, value);
    } catch (error) {
      console.error('Error updating alert settings:', error);
      alert('Error updating settings: ' + error.message);
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'expiry_alert': return <Calendar className="w-5 h-5" />;
      case 'low_stock':
      case 'critical_stock': return <Package className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">Inventory alerts for your restaurant</p>
        </div>

        {showEmailSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
            <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Email Notification Settings</h2>
                <button 
                  onClick={() => setShowEmailSettings(false)} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${emailSettings.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Mail className={`w-5 h-5 ${emailSettings.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-600">
                          {emailSettings.enabled ? 'Enabled - Receiving emails' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleEmailToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        emailSettings.enabled ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          emailSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Addresses
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Add multiple email addresses to receive notifications
                  </p>
                  
                  <div className="flex gap-2 mb-3">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                      placeholder="email@example.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleAddEmail}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {emailSettings.emails.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                        No email addresses added yet
                      </p>
                    ) : (
                      emailSettings.emails.map((email, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{email}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveEmail(email)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Alert Types</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Low Stock Alerts</p>
                        <p className="text-sm text-gray-600">Get notified when items are running low</p>
                      </div>
                      <button
                        onClick={() => handleUpdateAlertSettings('lowStockAlerts', !emailSettings.lowStockAlerts)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          emailSettings.lowStockAlerts ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            emailSettings.lowStockAlerts ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Expiry Alerts</p>
                        <p className="text-sm text-gray-600">Get notified before items expire</p>
                      </div>
                      <button
                        onClick={() => handleUpdateAlertSettings('expiryAlerts', !emailSettings.expiryAlerts)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          emailSettings.expiryAlerts ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            emailSettings.expiryAlerts ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {emailSettings.expiryAlerts && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Alert Days Before Expiry
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={emailSettings.expiryDaysBefore}
                          onChange={(e) => handleUpdateAlertSettings('expiryDaysBefore', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Receive alerts {emailSettings.expiryDaysBefore} days before items expire
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unread ({stats.unread})
              </button>
              <button
                onClick={() => setFilter('low_stock')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filter === 'low_stock'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Stock Alerts
              </button>
              <button
                onClick={() => setFilter('expiry')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filter === 'expiry'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Expiry Alerts
              </button>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              {stats.unread > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark All Read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => setShowDeleteAllModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
              <p className="text-gray-500">
                {filter === 'all'
                  ? "You're all caught up! No notifications at the moment."
                  : `No ${filter.replace('_', ' ')} notifications.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg flex-shrink-0 ${getSeverityColor(notification.severity)}`}>
                      {getTypeIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {notification.title}
                            </h3>
                            {!notification.is_read && (
                              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-base text-gray-700 mb-3">
                            {notification.message}
                          </p>

                          {notification.inventory_items && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
                              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <Package className="w-4 h-4 text-blue-600" />
                                {notification.inventory_items.name}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>SKU: {notification.inventory_items.sku}</span>
                                {notification.type !== 'expiry_alert' && (
                                  <span className="font-medium">
                                    Stock: {notification.inventory_items.current_stock}{' '}
                                    {notification.inventory_items.units?.abbreviation || 'units'}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${getSeverityColor(notification.severity)}`}>
                          {notification.severity.charAt(0).toUpperCase() + notification.severity.slice(1)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-500">
                          {new Date(notification.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>

                        <div className="flex items-center gap-3">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex items-center gap-1.5"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Delete</span>
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

        {/* Delete All Modal */}
        {showDeleteAllModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Delete All Notifications?</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete all notifications? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}