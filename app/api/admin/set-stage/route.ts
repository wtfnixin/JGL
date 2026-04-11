import { supabaseAdmin } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin-auth'

export async function POST(req: Request) {
  try {
    if (!isAdmin(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    if (!body.team_id || typeof body.team_id !== 'string') {
      return Response.json({ error: 'team_id is required' }, { status: 400 })
    }

    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('id', body.team_id)
      .maybeSingle()

    if (teamError || !team) {
      return Response.json({ error: 'Team not found' }, { status: 404 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('game_state')
      .update({
        current_team_id: body.team_id,
        phase: 'waiting',
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)

    if (updateError) throw updateError

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[set-stage] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
