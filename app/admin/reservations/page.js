"use client"
import { Calendar } from 'lucide-react'

export default function ReservationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Calendar className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reservations</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage table reservations</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Reservations Module</h3>
        <p className="text-gray-500 dark:text-gray-400">This feature will be implemented soon.</p>
      </div>
    </div>
  )
}