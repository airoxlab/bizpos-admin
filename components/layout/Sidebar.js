"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  CreditCard,
  Menu as MenuIcon,
  Package,
  ChevronRight,
  Store,
  PackageSearch,
  Users,
  Truck,
  Bell,
  BarChart3,
  Bike,
  Tag,
  TestTube,
  DatabaseBackup
} from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedMenu, setExpandedMenu] = useState('products')

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/admin', 
      icon: LayoutDashboard
    },
    {
      name: 'Products',
      icon: ShoppingBag,
      submenu: [
        { name: 'Menus', href: '/admin/products/menus', icon: MenuIcon },
        { name: 'Catalog', href: '/admin/products/catalog', icon: Package },
        { name: 'Deals', href: '/admin/products/deals', icon: Tag }
      ]
    },
    { name: 'Orders', href: '/admin/orders', icon: Receipt },
    { name: 'Expenses', href: '/admin/expenses', icon: CreditCard },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    { name: 'Inventory', href: '/admin/inventory', icon: PackageSearch },
    { name: 'Supplier', href: '/admin/supplier', icon: Truck },
    { name: 'Delivery Boy', href: '/admin/deliveryboy', icon: Bike },
    // { name: 'Test-Deal', href: '/test-deals', icon: DatabaseBackup }
  ]

  const toggleSubmenu = (menuName) => {
    setExpandedMenu(expandedMenu === menuName ? null : menuName)
  }

  return (
    <div className="w-60 bg-slate-800 flex flex-col h-screen">
      {/* Logo */}
      <div className="px-4 py-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-base">BIZPOS</h1>
            <p className="text-slate-400 text-xs">Restaurant Manager</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (item.submenu) {
            const isExpanded = expandedMenu === item.name.toLowerCase()
            const hasActiveChild = item.submenu.some(sub => pathname === sub.href)
            
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleSubmenu(item.name.toLowerCase())}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    hasActiveChild || isExpanded
                      ? 'bg-slate-700 text-white' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`} />
                </button>
                
                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={`flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors ${
                          pathname === subItem.href
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <subItem.icon className="w-4 h-4" />
                        <span>{subItem.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                pathname === item.href
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Stats */}
    </div>
  )
}