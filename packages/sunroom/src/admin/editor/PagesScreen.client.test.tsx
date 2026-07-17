// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PagesScreen } from './PagesScreen.js'
import type { ActionResult, EditorActions } from './types.js'

const ok: ActionResult = { ok: true }

function actionsMock(overrides: Partial<EditorActions> = {}): EditorActions {
  return {
    savePage: vi.fn(async (): Promise<ActionResult> => ok),
    createPage: vi.fn(async (): Promise<ActionResult> => ok),
    deletePage: vi.fn(async (): Promise<ActionResult> => ok),
    reorderPages: vi.fn(async (): Promise<ActionResult> => ok),
    ...overrides,
  }
}

const pages = [
  { slug: '', title: 'Home', position: 0 },
  { slug: 'about', title: 'About', position: 1 },
]

describe('PagesScreen', () => {
  it('lists pages and calls createPage with the entered slug/title', async () => {
    const actions = actionsMock()
    render(<PagesScreen pages={pages} actions={actions} />)
    expect(screen.getByText('About')).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/slug/i), { target: { value: 'services' } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Services' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => expect(actions.createPage).toHaveBeenCalledWith({ slug: 'services', title: 'Services' }))
  })

  it('shows the error message when createPage fails', async () => {
    const actions = actionsMock({
      createPage: vi.fn(async (): Promise<ActionResult> => ({ ok: false, reason: 'validation', message: 'bad slug' })),
    })
    render(<PagesScreen pages={pages} actions={actions} />)
    fireEvent.change(screen.getByLabelText(/slug/i), { target: { value: 'Bad' } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'B' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => expect(screen.getByText('bad slug')).toBeTruthy())
  })

  it('disables delete for the home page', () => {
    render(<PagesScreen pages={pages} actions={actionsMock()} />)
    const homeDelete = screen.getByRole('button', { name: /delete home/i })
    expect((homeDelete as HTMLButtonElement).disabled).toBe(true)
  })
})
