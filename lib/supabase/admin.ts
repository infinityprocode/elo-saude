import { createClient } from '@supabase/supabase-js'

// Cliente de serviço, SEM cookies. Só no servidor e só depois de validar o token de compartilhamento.
export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
