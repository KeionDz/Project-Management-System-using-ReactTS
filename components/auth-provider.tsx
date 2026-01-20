"use client"

import React, { createContext, useContext, useReducer, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export interface User {
  id: string
  email: string
  name: string
  role: string
  avatarUrl: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
}

type AuthAction =
  | { type: "SET_USER"; payload: User }
  | { type: "LOGOUT" }
  | { type: "SET_LOADING"; payload: boolean }

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
}

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload, isAuthenticated: true, loading: false }
    case "LOGOUT":
      return { ...state, user: null, isAuthenticated: false, loading: false }
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

const AuthContext = createContext<{
  state: AuthState
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  setUser: (user: User) => void
  refreshUser?: () => void
} | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const { toast } = useToast()

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("devtrack_user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User
        dispatch({ type: "SET_USER", payload: user })
      } catch {
        localStorage.removeItem("devtrack_user")
        dispatch({ type: "SET_LOADING", payload: false })
      }
    } else {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }, [])

  // Utility to ensure avatar is always a valid URL
  const withAvatar = (user: User) => {
    return {
      ...user,
      avatarUrl:
        user.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff&size=64`,
    }
  }

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: "SET_LOADING", payload: true })

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Login failed")

      const user = withAvatar({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        avatarUrl: data.user.avatarUrl,
      })

      localStorage.setItem("devtrack_user", JSON.stringify(user))
      dispatch({ type: "SET_USER", payload: user })

      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.name}, ${user.role}`,
      })

      return true
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      })
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  // Register function
  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    dispatch({ type: "SET_LOADING", payload: true })

    if (!email || password.length < 6 || !name.trim()) {
      toast({
        title: "Registration Failed",
        description: "Fill in all fields. Password must be at least 6 characters.",
        variant: "destructive",
      })
      dispatch({ type: "SET_LOADING", payload: false })
      return false
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Registration failed")

      const user = withAvatar({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role || "USER",
        avatarUrl: data.user.avatarUrl,
      })

      localStorage.setItem("devtrack_user", JSON.stringify(user))
      dispatch({ type: "SET_USER", payload: user })

      toast({
        title: "Account Created!",
        description: `Welcome to DevTrack, ${user.name}!`,
      })

      return true
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      })
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem("devtrack_user")
    localStorage.removeItem("active_project")
    sessionStorage.clear()

    dispatch({ type: "LOGOUT" })

    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    })
  }

  // Update current user info (for profile updates)
  const setUser = (user: User) => {
    const finalUser = withAvatar(user)
    localStorage.setItem("devtrack_user", JSON.stringify(finalUser))
    dispatch({ type: "SET_USER", payload: finalUser })
  }

  // Optional: Refresh user from localStorage
  const refreshUser = () => {
    const storedUser = localStorage.getItem("devtrack_user")
    if (storedUser) {
      const user = JSON.parse(storedUser) as User
      dispatch({ type: "SET_USER", payload: withAvatar(user) })
    }
  }

  return (
    <AuthContext.Provider value={{ state, login, register, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
