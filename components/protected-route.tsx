"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { state } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!state.loading && !state.isAuthenticated) {
      router.replace("/login")
    }
  }, [state.loading, state.isAuthenticated, router])

  // Show loading state while checking authentication
  if (state.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!state.isAuthenticated) {
    return null
  }

  return <>{children}</>
}
