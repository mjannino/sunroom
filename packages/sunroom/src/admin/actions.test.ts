import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }))

const getSession = vi.fn()
vi.mock('./session-server.js', () => ({ getSession: () => getSession() }))

import { resetStores } from '../store/singleton.js'
import { createPageAction, deletePageAction, reorderPagesAction, savePageAction } from './actions.js'

let dir: string
const SIGNED_IN = { email: 'jane@acme.com', name: 'Jane' }

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'sunroom-actions-'))
  process.env.SUNROOM_CONTENT_DIR = dir
  resetStores()
  revalidatePath.mockClear()
  getSession.mockResolvedValue(SIGNED_IN)
})

afterEach(async () => {
  resetStores()
  delete process.env.SUNROOM_CONTENT_DIR
  await rm(dir, { recursive: true, force: true })
})

describe('auth gate', () => {
  it('performs NO write when unauthenticated', async () => {
    getSession.mockResolvedValue(null)
    const res = await createPageAction({ slug: 'about', title: 'About' })
    expect(res).toEqual({ ok: false, reason: 'unauthorized', message: expect.any(String) })
    // prove no write: a fresh authed read shows the page was never created
    getSession.mockResolvedValue(SIGNED_IN)
    const list = await reorderPagesAction([]) // cheap authed call to force store init
    expect(list.ok).toBe(true)
    // the store has only the home page
    const { getStore } = await import('../store/singleton.js')
    const { resolveConfig } = await import('../core/registry.js')
    const store = await getStore(resolveConfig({ sections: {} }))
    expect(store.listPages().map((p) => p.slug)).toEqual([''])
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('createPageAction', () => {
  it('creates a page, revalidates the nav and the new route, authored by the editor', async () => {
    const res = await createPageAction({ slug: 'about', title: 'About' })
    expect(res.ok).toBe(true)
    const { getStore } = await import('../store/singleton.js')
    const { resolveConfig } = await import('../core/registry.js')
    const store = await getStore(resolveConfig({ sections: {} }))
    expect(store.getPage('about')?.page.title).toBe('About')
    expect(revalidatePath).toHaveBeenCalledWith('/about')
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('rejects an invalid slug with a validation result and no write', async () => {
    const res = await createPageAction({ slug: 'Bad Slug', title: 'X' })
    expect(res).toMatchObject({ ok: false, reason: 'validation' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects a duplicate slug', async () => {
    await createPageAction({ slug: 'about', title: 'About' })
    const res = await createPageAction({ slug: 'about', title: 'Again' })
    expect(res).toMatchObject({ ok: false, reason: 'conflict' })
  })
})

describe('savePageAction', () => {
  it('saves content and revalidates the route and the nav layout', async () => {
    await createPageAction({ slug: 'about', title: 'About' })
    const { getStore } = await import('../store/singleton.js')
    const { resolveConfig } = await import('../core/registry.js')
    const store = await getStore(resolveConfig({ sections: {} }))
    const entry = store.getPage('about')!
    revalidatePath.mockClear()

    const edited = { ...entry.page, title: 'About Us' }
    const res = await savePageAction(edited, entry.version)
    expect(res.ok).toBe(true)
    expect(store.getPage('about')?.page.title).toBe('About Us')
    expect(revalidatePath).toHaveBeenCalledWith('/about')
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout') // title is nav-visible
  })

  it('returns a conflict on a stale version', async () => {
    await createPageAction({ slug: 'about', title: 'About' })
    const { getStore } = await import('../store/singleton.js')
    const { resolveConfig } = await import('../core/registry.js')
    const store = await getStore(resolveConfig({ sections: {} }))
    const entry = store.getPage('about')!
    await savePageAction({ ...entry.page, title: 'First' }, entry.version)
    const res = await savePageAction({ ...entry.page, title: 'Second' }, entry.version)
    expect(res).toMatchObject({ ok: false, reason: 'conflict' })
  })

  it('revalidates "/" for the home page', async () => {
    const { getStore } = await import('../store/singleton.js')
    const { resolveConfig } = await import('../core/registry.js')
    const store = await getStore(resolveConfig({ sections: {} }))
    const home = store.getPage('')!
    await savePageAction({ ...home.page, title: 'Home!' }, home.version)
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })
})

describe('deletePageAction', () => {
  it('deletes and revalidates', async () => {
    await createPageAction({ slug: 'about', title: 'About' })
    const { getStore } = await import('../store/singleton.js')
    const { resolveConfig } = await import('../core/registry.js')
    const store = await getStore(resolveConfig({ sections: {} }))
    revalidatePath.mockClear()
    const res = await deletePageAction('about')
    expect(res.ok).toBe(true)
    expect(store.getPage('about')).toBeNull()
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('refuses to delete the home page (validation)', async () => {
    const res = await deletePageAction('')
    expect(res).toMatchObject({ ok: false, reason: 'validation' })
  })
})

describe('reorderPagesAction', () => {
  it('reassigns positions by the given order', async () => {
    await createPageAction({ slug: 'a', title: 'A' })
    await createPageAction({ slug: 'b', title: 'B' })
    const res = await reorderPagesAction(['b', 'a', ''])
    expect(res.ok).toBe(true)
    const { getStore } = await import('../store/singleton.js')
    const { resolveConfig } = await import('../core/registry.js')
    const store = await getStore(resolveConfig({ sections: {} }))
    expect(store.listPages().map((p) => p.slug)).toEqual(['b', 'a', ''])
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})
