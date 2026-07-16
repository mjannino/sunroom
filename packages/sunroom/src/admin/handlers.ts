import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import type { AuthConfig } from './config.js'
import { callbackUrl, getAuthConfig } from './config.js'
import { authorizeIdentity, checkOwnerToken, checkState } from './flow.js'
import { buildAuthorization, exchangeCode } from './google.js'
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  STATE_COOKIE,
  TXN_TTL_S,
  VERIFIER_COOKIE,
  newSession,
  signSession,
} from './session.js'

export interface HandlerDeps {
  getConfig(): AuthConfig
  buildAuthorization: typeof buildAuthorization
  exchangeCode: typeof exchangeCode
}

export interface SunroomHandlers {
  GET(req: NextRequest): Promise<Response>
  POST(req: NextRequest): Promise<Response>
}

const OWNER_EMAIL = 'owner@sunroom.local'

const txnCookie = { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: TXN_TTL_S } as const
const sessionCookie = { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: SESSION_TTL_MS / 1000 } as const

function action(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? ''
}

function origin(req: NextRequest): string {
  return req.nextUrl.origin
}

function setSession(res: NextResponse, config: AuthConfig, email: string, name: string): void {
  res.cookies.set(SESSION_COOKIE, signSession(newSession(email, name), config.sessionSecret), sessionCookie)
}

function errorPage(message: string, status: 400 | 403): NextResponse {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Sign-in error</title><body style="font-family:system-ui;padding:2rem"><h1>Cannot sign you in</h1><p>${message}</p><p><a href="/admin">Back</a></p></body>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}

export function createHandlers(deps: Partial<HandlerDeps> = {}): SunroomHandlers {
  const getConfig = deps.getConfig ?? getAuthConfig
  const build = deps.buildAuthorization ?? buildAuthorization
  const exchange = deps.exchangeCode ?? exchangeCode

  async function GET(req: NextRequest): Promise<Response> {
    const config = getConfig()

    if (action(req) === 'login') {
      const redirectUri = callbackUrl(config, origin(req))
      const authz = build(config, redirectUri)
      const res = NextResponse.redirect(authz.url, 302)
      res.cookies.set(STATE_COOKIE, authz.state, txnCookie)
      res.cookies.set(VERIFIER_COOKIE, authz.codeVerifier, txnCookie)
      return res
    }

    if (action(req) === 'callback') {
      const returnedState = req.nextUrl.searchParams.get('state')
      const code = req.nextUrl.searchParams.get('code')
      const storedState = req.cookies.get(STATE_COOKIE)?.value
      const verifier = req.cookies.get(VERIFIER_COOKIE)?.value

      const clearTxn = (res: NextResponse): NextResponse => {
        res.cookies.delete(STATE_COOKIE)
        res.cookies.delete(VERIFIER_COOKIE)
        return res
      }

      if (!checkState(returnedState, storedState) || !code || !verifier) {
        return clearTxn(errorPage('Your sign-in link expired or was tampered with. Please try again.', 400))
      }

      let identity
      try {
        identity = await exchange(config, callbackUrl(config, origin(req)), code, verifier)
      } catch {
        return clearTxn(errorPage('Google sign-in failed. Please try again.', 400))
      }

      const decision = authorizeIdentity(config, identity)
      if (!decision.ok) return clearTxn(errorPage(decision.reason, decision.status))

      const res = NextResponse.redirect(new URL('/admin', origin(req)), 302)
      setSession(res, config, identity.email, identity.name)
      return clearTxn(res)
    }

    return new NextResponse('Not found', { status: 404 })
  }

  async function POST(req: NextRequest): Promise<Response> {
    const config = getConfig()

    if (action(req) === 'owner') {
      const form = await req.formData()
      const token = form.get('token')
      if (!checkOwnerToken(config.ownerToken, typeof token === 'string' ? token : undefined)) {
        return errorPage('Invalid owner token.', 403)
      }
      // 303 See Other: force the browser to GET /admin after this POST.
      const res = NextResponse.redirect(new URL('/admin', origin(req)), 303)
      setSession(res, config, OWNER_EMAIL, 'Owner')
      return res
    }

    if (action(req) === 'logout') {
      const res = NextResponse.redirect(new URL('/admin', origin(req)), 303)
      res.cookies.set(SESSION_COOKIE, '', { ...sessionCookie, maxAge: 0 })
      return res
    }

    return new NextResponse('Not found', { status: 404 })
  }

  return { GET, POST }
}
