'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServidor } from '@/lib/supabase/server'

// A recepção só muda o STATUS da consulta (o banco limita a agenda da própria organização).
const PERMITIDOS = new Set(['confirmado', 'aguardando', 'faltou', 'agendado'])

export async function marcar(form: FormData) {
  const id = String(form.get('id') ?? ''), status = String(form.get('status') ?? '')
  if (!/^[0-9a-f-]{36}$/.test(id) || !PERMITIDOS.has(status)) return
  const sb = await supabaseServidor()
  await sb.from('agenda').update({ status }).eq('id', id)
  revalidatePath('/recepcao')
}
