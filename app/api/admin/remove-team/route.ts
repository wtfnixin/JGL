import { supabaseAdmin } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin-auth'

export async function DELETE(req: Request) {
  try {
    if (!isAdmin(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    if (!body.team_id || typeof body.team_id !== 'string') {
      return Response.json({ error: 'team_id is required' }, { status: 400 })
    }

    const { data: gameState, error: gsError } = await supabaseAdmin
      .from('game_state')
      .select('current_team_id')
      .eq('id', 1)
      .single()

    if (gsError) throw gsError

    if (gameState.current_team_id === body.team_id) {
      return Response.json({ error: 'Cannot remove team that is currently on stage' }, { status: 400 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', body.team_id)

    if (deleteError) throw deleteError

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[remove-team] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
