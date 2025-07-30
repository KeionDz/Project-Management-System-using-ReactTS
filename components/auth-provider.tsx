"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
}

type AuthAction = { type: "SET_USER"; payload: User } | { type: "LOGOUT" } | { type: "SET_LOADING"; payload: boolean }

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true, // Start with loading true to check for existing session
}

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      }
    case "LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
      }
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      }
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

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      const storedUser = localStorage.getItem("devtrack_user")
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          dispatch({ type: "SET_USER", payload: user })
        } catch (error) {
          localStorage.removeItem("devtrack_user")
          dispatch({ type: "SET_LOADING", payload: false })
        }
      } else {
        dispatch({ type: "SET_LOADING", payload: false })
      }
    }

    checkSession()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: "SET_LOADING", payload: true })

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Simple validation - in a real app, this would be an API call
    if (email && password.length >= 6) {
      const user: User = {
        id: Date.now().toString(),
        email,
        name: email.split("@")[0], // Use email prefix as name
        avatar: `/placeholder.svg?height=32&width=32&text=${email.charAt(0).toUpperCase()}`,
      }

      // Store user in localStorage (in a real app, this would be handled by secure tokens)
      localStorage.setItem("devtrack_user", JSON.stringify(user))
      dispatch({ type: "SET_USER", payload: user })

      toast({
        title: "Welcome back!",
        description: `Successfully logged in as ${user.name}`,
      })

      return true
    } else {
      dispatch({ type: "SET_LOADING", payload: false })
      toast({
        title: "Login Failed",
        description: "Invalid email or password. Password must be at least 6 characters.",
        variant: "destructive",
      })
      return false
    }
  }

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    dispatch({ type: "SET_LOADING", payload: true })

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Simple validation - in a real app, this would be an API call
    if (email && password.length >= 6 && name.trim()) {
      const user: User = {
        id: Date.now().toString(),
        email,
        name: name.trim(),
        avatar: `/placeholder.svg?height=32&width=32&text=${name.charAt(0).toUpperCase()}`,
      }

      // Store user in localStorage (in a real app, this would be handled by secure tokens)
      localStorage.setItem("devtrack_user", JSON.stringify(user))
      dispatch({ type: "SET_USER", payload: user })

      toast({
        title: "Account Created!",
        description: `Welcome to DevTrack, ${user.name}!`,
      })

      return true
    } else {
      dispatch({ type: "SET_LOADING", payload: false })
      toast({
        title: "Registration Failed",
        description: "Please fill in all fields. Password must be at least 6 characters.",
        variant: "destructive",
      })
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem("devtrack_user")
    dispatch({ type: "LOGOUT" })
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    })
  }

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
