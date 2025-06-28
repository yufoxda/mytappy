import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fvtuncrptesupxscpkdu.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!

// Server-side client (for Server Actions)
export const supabase = createClient(supabaseUrl, supabaseKey)

// Singleton instance for browser-side client
let browserClient: ReturnType<typeof createClient> | null = null

export const createSupabaseBrowserClient = () => {
  if (!browserClient) {
    console.log('Creating Supabase client with:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'exists' : 'missing',
    })
    browserClient = createClient(supabaseUrl, supabaseKey)
  }
  return browserClient
}

