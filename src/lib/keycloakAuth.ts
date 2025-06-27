import { createSupabaseBrowserClient } from './supabase'

export interface KeycloakUser {
  id: string
  email: string
  name: string
  preferred_username: string
  given_name?: string
  family_name?: string
  roles?: string[]
}

export interface AuthSession {
  user: KeycloakUser | null
  access_token: string | null
  expires_at: number | null
}

// Keycloak認証の開始（SSO対応）
export async function signInWithKeycloak(options?: { forceLogin?: boolean }): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient()
  
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'keycloak',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          // SSOの場合は通常 prompt='none' を使用して自動ログインを促進
          // forceLoginが true の場合のみログインを強制
          prompt: options?.forceLogin ? 'login' : 'none',
          // Keycloak SSOセッションがない場合のフォールバック
          max_age: '0', // セッションの有効性を厳密にチェック
        },
      },
    })
    
    return { error }
  } catch (error) {
    console.error('Keycloak sign-in error:', error)
    return { error: error as Error }
  }
}

// ログアウト
export async function signOut(): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    return { error }
  } catch (error) {
    console.error('Sign out error:', error)
    return { error: error as Error }
  }
}

// 現在の認証セッション取得
export async function getSession(): Promise<AuthSession> {
  const supabase = createSupabaseBrowserClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Get session error:', error)
      return { user: null, access_token: null, expires_at: null }
    }
    
    if (!session) {
      return { user: null, access_token: null, expires_at: null }
    }
    
    // Keycloakユーザー情報を抽出
    const user: KeycloakUser = {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.name || session.user.user_metadata?.preferred_username || '',
      preferred_username: session.user.user_metadata?.preferred_username || '',
      given_name: session.user.user_metadata?.given_name,
      family_name: session.user.user_metadata?.family_name,
      roles: session.user.user_metadata?.roles || []
    }
    
    return {
      user,
      access_token: session.access_token,
      expires_at: session.expires_at || null
    }
  } catch (error) {
    console.error('Get session error:', error)
    return { user: null, access_token: null, expires_at: null }
  }
}

// 認証状態の監視
export function onAuthStateChange(callback: (session: AuthSession) => void) {
  const supabase = createSupabaseBrowserClient()
  
  return supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event, session)
    
    if (session) {
      const user: KeycloakUser = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.name || session.user.user_metadata?.preferred_username || '',
        preferred_username: session.user.user_metadata?.preferred_username || '',
        given_name: session.user.user_metadata?.given_name,
        family_name: session.user.user_metadata?.family_name,
        roles: session.user.user_metadata?.roles || []
      }
      
      callback({
        user,
        access_token: session.access_token,
        expires_at: session.expires_at || null
      })
    } else {
      callback({ user: null, access_token: null, expires_at: null })
    }
  })
}

// Keycloakユーザー情報からアプリケーションユーザーを作成・更新
export async function syncKeycloakUser(keycloakUser: KeycloakUser) {
  try {
    const response = await fetch('/api/auth/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keycloakId: keycloakUser.id,
        email: keycloakUser.email,
        name: keycloakUser.name,
        username: keycloakUser.preferred_username,
      }),
    })
    
    if (!response.ok) {
      throw new Error('Failed to sync user')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error syncing Keycloak user:', error)
    throw error
  }
}

// SSO セッション確認（自動ログインを試行）
export async function checkSSOSession(): Promise<{ hasSession: boolean; error: Error | null }> {
  const supabase = createSupabaseBrowserClient()
  
  try {
    // まず現在のSupabaseセッションを確認
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session && session.expires_at && Date.now() / 1000 < session.expires_at) {
      return { hasSession: true, error: null }
    }
    
    // Supabaseセッションがない場合、Keycloak SSO を確認
    // prompt='none'で自動ログインを試行（既存セッションがある場合のみ成功）
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'keycloak',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?sso=true`,
        queryParams: {
          prompt: 'none', // ユーザー操作なしで認証を試行
          max_age: '0',
        },
      },
    })
    
    if (error) {
      // prompt='none'でエラーが発生した場合、SSOセッションがない
      return { hasSession: false, error: null }
    }
    
    return { hasSession: true, error: null }
  } catch (error) {
    console.error('SSO session check error:', error)
    return { hasSession: false, error: error as Error }
  }
}

// 強制ログイン（既存セッションを無視）
export async function forceLogin(): Promise<{ error: Error | null }> {
  return signInWithKeycloak({ forceLogin: true })
}
