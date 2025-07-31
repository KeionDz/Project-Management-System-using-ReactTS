"use client"

import React, { createContext, useContext, useReducer, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export interface User {
  id: string
  email: string
  name: string
  role: string      // ✅ Add role
  avatar?: string
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
} | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const { toast } = useToast()

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

      const user: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,   // ✅ Include role
        avatar: `/placeholder.svg?height=32&width=32&text=${data.user.name.charAt(0).toUpperCase()}`,
      }

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

      const user: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role || "USER", // ✅ Default to USER if not provided
        avatar: `/placeholder.svg?height=32&width=32&text=${data.user.name.charAt(0).toUpperCase()}`,
      }

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

  const logout = () => {
  // ✅ Clear all relevant localStorage keys for DevTrack
  localStorage.removeItem("devtrack_user")
  localStorage.removeItem("active_project") // optional: clear active project
  
  // ✅ Reset state
  dispatch({ type: "LOGOUT" })

  // ✅ Clear session storage if used
  sessionStorage.clear()

  // ✅ Notify user
  toast({
    title: "Logged Out",
    description: "You have been successfully logged out.",
  })
}


  return (
    <AuthContext.Provider value={{ state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
