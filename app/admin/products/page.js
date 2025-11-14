// app/admin/products/page.js
"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProductsPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/admin/products/catalog')
  }, [router])
  
  return null
}