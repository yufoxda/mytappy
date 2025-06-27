'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getSession, onAuthStateChange, syncKeycloakUser, type AuthSession } from '@/lib/keycloakAuth'

interface AuthContextType {
  session: AuthSession | null
  loading: boolean
  user: any | null // アプリケーション側のユーザー情報
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any | null>(null)

  const refreshSession = async () => {
    try {
      const currentSession = await getSession()
      setSession(currentSession)
      
      if (currentSession.user) {
        // Keycloakユーザーをアプリケーションユーザーと同期
        try {
          const syncResult = await syncKeycloakUser(currentSession.user)
          setUser(syncResult.user)
        } catch (error) {
          console.error('Failed to sync user:', error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to refresh session:', error)
      setSession({ user: null, access_token: null, expires_at: null })
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 初期セッション取得とSSO確認
    const initializeAuth = async () => {
      try {
        // まず現在のセッションを確認
        const currentSession = await getSession()
        setSession(currentSession)
        
        if (currentSession.user) {
          // 既存セッションがある場合
          try {
            const syncResult = await syncKeycloakUser(currentSession.user)
            setUser(syncResult.user)
          } catch (error) {
            console.error('Failed to sync user:', error)
            setUser(null)
          }
        } else {
          // セッションがない場合、SSO確認を試行
          // URLパラメータでSSO確認を無効化できる
          const urlParams = new URLSearchParams(window.location.search)
          const skipSSO = urlParams.get('skip_sso') === 'true'
          
          if (!skipSSO) {
            console.log('Checking for existing SSO session...')
            try {
              // SSO セッション確認は非同期で行い、UIをブロックしない
              const { checkSSOSession } = await import('@/lib/keycloakAuth')
              checkSSOSession().then(({ hasSession }) => {
                if (!hasSession) {
                  console.log('No existing SSO session found')
                }
              }).catch(error => {
                console.log('SSO check failed:', error)
              })
            } catch (error) {
              console.log('SSO module load failed:', error)
            }
          }
          setUser(null)
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        setSession({ user: null, access_token: null, expires_at: null })
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // 認証状態の変更を監視
    const { data: { subscription } } = onAuthStateChange(async (newSession) => {
      setSession(newSession)
      
      if (newSession.user) {
        try {
          const syncResult = await syncKeycloakUser(newSession.user)
          setUser(syncResult.user)
        } catch (error) {
          console.error('Failed to sync user on auth change:', error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const value = {
    session,
    loading,
    user,
    refreshSession
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// 認証が必要なページ用のHOC
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { session, loading } = useAuth()
    
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      )
    }
    
    if (!session?.user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              ログインが必要です
            </h2>
            <p className="text-sm text-gray-600">
              この機能を利用するにはログインしてください
            </p>
            <a
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              ログインページへ
            </a>
          </div>
        </div>
      )
    }
    
    return <Component {...props} />
  }
}
