import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Global map to hold IP and their request arrays (timestamps in ms)
// In a serverless edge environment, this map will persist ONLY per isolated worker instance,
// making it fantastic for baseline anti-bot defenses but not a total Redis-replacement.
const rateLimitMap = new Map<string, number[]>()

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
  
  const now = Date.now()
  const windowTime = 60000 // 60 seconds
  const maxRequests = 60 // Max requests per window
  
  const timestamps = rateLimitMap.get(ip) || []
  
  // Filter out requests older than the window
  const validTimestamps = timestamps.filter(timestamp => now - timestamp < windowTime)
  
  if (validTimestamps.length >= maxRequests) {
    return NextResponse.json(
      { error: 'Too Many Requests - Rate Limit Exceeded. Anti-Spam protection activated.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }
  
  validTimestamps.push(now)
  rateLimitMap.set(ip, validTimestamps)
  
  // Optional memory safety:
  // Since Edge runtime strictly spins down inactive instances, memory leaks are generally wiped,
  // but clearing here limits local Dev-Server memory expansion during long-running sessions.
  if (rateLimitMap.size > 10000) {
    rateLimitMap.clear()
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
