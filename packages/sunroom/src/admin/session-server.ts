import 'server-only'
import { cookies } from 'next/headers'
import { getAuthConfig } from './config.js'
import { SESSION_COOKIE, verifySession } from './session.js'

/** Reads and verifies the session cookie. Returns the identity or null. */
export async function getSession(): Promise<{ email: string; name: string } | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  const session = verifySession(token, getAuthConfig().sessionSecret)
  if (!session) return null
  return { email: session.email, name: session.name }
}
