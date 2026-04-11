import { supabaseAdmin } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin-auth'

export async function POST(req: Request) {
  try {
    if (!isAdmin(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return Response.json({ error: 'Name is required' }, { status: 400 })
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: team, error: insertError } = await supabaseAdmin
      .from('teams')
      .insert({ name: body.name.trim(), code })
      .select('*')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return Response.json({ error: 'Code collision, try again' }, { status: 409 })
      }
      throw insertError
    }

    const { error: scoreError } = await supabaseAdmin
      .from('scores')
      .insert({ team_id: team.id })

    if (scoreError) throw scoreError

    return Response.json({ id: team.id, name: team.name, code: team.code })
  } catch (error) {
    console.error('[create-team] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
