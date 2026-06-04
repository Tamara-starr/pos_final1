'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { User } from './types'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('pos_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { localStorage.removeItem('pos_user') }
    }
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, username, role')
        .eq('username', username)
        .eq('passwd_hash', password)
        .single()

      if (error || !data) { setIsLoading(false); return false }

      const loggedInUser: User = {
        id: String(data.user_id),
        email: data.username,
        name: `${data.first_name} ${data.last_name}`,
        role: String(data.role).toLowerCase().trim() as 'admin' | 'cashier',
      }

      setUser(loggedInUser)
      localStorage.setItem('pos_user', JSON.stringify(loggedInUser))
      setIsLoading(false)
      return true
    } catch { setIsLoading(false); return false }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('pos_user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
