import { supabase } from './supabase'
import type { Profile } from './types'

/** Records an admin action. Only admins are allowed to insert (see RLS). */
export async function logAudit(actor: Profile | null, action: string) {
  if (!actor) return
  await supabase.from('audit_log').insert({ actor_id: actor.id, actor_name: actor.full_name || actor.email, action })
}
