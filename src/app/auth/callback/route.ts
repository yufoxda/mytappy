import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createSupabaseBrowserClient()
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      console.error('Auth callback error:', error)
    }
  }

  // エラーの場合はログインページにリダイレクト
  return NextResponse.redirect(`${origin}/auth/login?error=callback_error`)
}
