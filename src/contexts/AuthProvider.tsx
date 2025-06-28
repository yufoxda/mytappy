'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshAuth: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessingAuth, setIsProcessingAuth] = useState(false) // 重複処理防止フラグ
  const supabase = createSupabaseBrowserClient()

  console.log('AuthProvider - Current state:', { user, loading, isProcessingAuth })

  useEffect(() => {
    // URLパラメータからエラーをチェック（クライアントサイドのみ）
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const error = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')
      
      if (error) {
        console.error('Auth error from URL:', { error, errorDescription })
        if (error === 'server_error' && errorDescription?.includes('over_email_send_rate_limit')) {
          console.warn('Email send rate limit exceeded. Please wait 10 seconds before retrying.')
        }
        // エラーパラメータをURLから削除
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)
      }
    }

    // Get initial session
    const getInitialSession = async () => {
      if (isProcessingAuth) {
        console.log('AuthProvider - Auth processing already in progress, skipping')
        return
      }
      
      setIsProcessingAuth(true)
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('AuthProvider - Full session response:', { session, error })
        if (error) {
          console.error('Error fetching session:', error)
        } else if (!session) {
          console.warn('No session found. User might not be logged in.')
        } else {
          console.log('Session successfully fetched:', session)
        }
        setUser(session?.user ?? null)
        setLoading(false)
      } finally {
        setIsProcessingAuth(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('AuthProvider - Auth state change triggered:', { event, session })

        if (event === 'SIGNED_OUT' && user) {
          console.warn('AuthProvider - Ignoring SIGNED_OUT event as user is already signed in:', user)
          return
        }

        if (event === 'SIGNED_IN') {
          console.log('AuthProvider - User signed in successfully:', session)
        }

        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const refreshAuth = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('AuthProvider - Refreshing session:', { session, error })
    if (error) {
      console.error('Error refreshing session:', error)
    } else if (!session) {
      console.warn('No session found during refresh. User might not be logged in.')
    } else {
      console.log('Session successfully refreshed:', session)
    }
    setUser(session?.user ?? null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}
