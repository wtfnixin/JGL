import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { team_id, guess } = body

    if (!team_id || typeof team_id !== 'string' || typeof guess !== 'number') {
      return Response.json({ error: 'Missing or invalid fields' }, { status: 400 })
    }

    if (!Number.isInteger(guess) || guess < 0) {
      return Response.json({ error: 'Guess must be a positive integer' }, { status: 400 })
    }

    const { data: gameState, error: gsError } = await supabaseAdmin
      .from('game_state')
      .select('phase')
      .eq('id', 1)
      .single()

    if (gsError) throw gsError

    if (gameState.phase !== 'voting_closed') {
      return Response.json({ error: 'Guess submission only allowed after voting closes' }, { status: 403 })
    }

    const { data: scoreRec, error: scoreError } = await supabaseAdmin
      .from('scores')
      .select('guess_submitted')
      .eq('team_id', team_id)
      .maybeSingle()

    if (scoreError || !scoreRec) {
      return Response.json({ error: 'Team not found' }, { status: 404 })
    }

    if (scoreRec.guess_submitted) {
      return Response.json({ error: 'Guess already submitted' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('scores')
      .update({
        guess_submitted: true,
        guess_value: guess
      })
      .eq('team_id', team_id)

    if (updateError) throw updateError

    return Response.json({ ok: true, guess })

  } catch (error) {
    console.error('[submit-guess] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
