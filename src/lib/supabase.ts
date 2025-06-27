
import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fvtuncrptesupxscpkdu.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!

// Server-side client (for Server Actions)
export const supabase = createClient(supabaseUrl, supabaseKey)

// Browser-side client with auth support (for client-side usage)
export const createSupabaseBrowserClient = () => {
  return createBrowserClient(supabaseUrl, supabaseKey)
}

