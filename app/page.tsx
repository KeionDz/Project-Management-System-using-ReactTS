"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"

export default function DashboardPage() {
  const { state: authState } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authState.loading && !authState.isAuthenticated) {
      router.replace("/login")
    } else {
      router.replace("/dashboard")
    }
  }, [authState.loading, authState.isAuthenticated, router])

  return null
}
