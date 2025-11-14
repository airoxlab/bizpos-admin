"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, getUserProfile } from '@/lib/auth'
import AdminLayout from '@/components/layout/AdminLayout'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

export default function AdminLayoutWrapper({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getUser()
      
      if (!currentUser) {
        router.push('/auth/login')
        return
      }

      const { data: userProfile } = await getUserProfile(currentUser.id)
      setUser(currentUser)
      setProfile(userProfile)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <SkeletonLoader size={60} color="border-blue-500" />
      </div>
    )
  }

  return (
    <AdminLayout user={profile}>
      {children}
    </AdminLayout>
  )
}