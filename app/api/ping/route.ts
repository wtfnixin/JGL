export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json({ ok: true, time: Date.now() })
  } catch (error) {
    console.error('[ping] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
