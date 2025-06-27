'use client'

import { useState, useEffect } from 'react'
import { signInWithKeycloak, getSession, type AuthSession } from '@/lib/keycloakAuth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const router = useRouter()

  useEffect(() => {
    // セッション確認
    async function checkSession() {
      const currentSession = await getSession()
      setSession(currentSession)
      
      if (currentSession.user) {
        // 既にログイン済みの場合はホームページにリダイレクト
        router.push('/')
      }
    }
    
    checkSession()
  }, [router])

  const handleKeycloakLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // まずSSO セッションを確認
      const { checkSSOSession } = await import('@/lib/keycloakAuth')
      const { hasSession } = await checkSSOSession()
      
      if (hasSession) {
        // SSOセッションが有効な場合は自動的にリダイレクトされる
        return
      }
      
      // SSOセッションがない場合は通常のログインフローへ
      const { signInWithKeycloak } = await import('@/lib/keycloakAuth')
      const { error } = await signInWithKeycloak({ forceLogin: true })
      
      if (error) {
        setError('ログインに失敗しました: ' + error.message)
      }
      // 成功時はKeycloakのログインページにリダイレクトされる
    } catch (error) {
      setError('予期しないエラーが発生しました')
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              ログイン済み
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              こんにちは、{session.user.name}さん
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              ホームページに戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            MyTappyにログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Keycloak認証でセキュアにログインします
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <div>
            <button
              onClick={handleKeycloakLogin}
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ログイン中...
                </div>
              ) : (
                'Keycloakでログイン'
              )}
            </button>
          </div>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">
                  または
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => router.push('/')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ゲストとして続行
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
