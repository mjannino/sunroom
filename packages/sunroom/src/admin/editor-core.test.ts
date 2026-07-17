import { describe, expect, it } from 'vitest'
import { f } from '../core/fields.js'
import type { Page } from '../store/types.js'
import { defaultProps, editReducer, screenFromSegments, serializeRegistry } from './editor-core.js'

describe('defaultProps', () => {
  it('produces type-appropriate defaults and honours declared defaults', () => {
    const fields = {
      heading: f.text({ required: true }),
      note: f.textarea(),
      count: f.number({ default: 3 }),
      flag: f.boolean(),
      size: f.select({ options: [{ label: 'L', value: 'lg' }] }),
      cta: f.object({ label: f.text() }),
      quotes: f.array(f.text()),
    }
    expect(defaultProps(fields)).toEqual({
      heading: '',
      note: '',
      count: 3,
      flag: false,
      size: 'lg',
      cta: { label: '' },
      quotes: [],
    })
  })
})

describe('serializeRegistry', () => {
  it('drops the React components, keeps label/thumbnail/fields', () => {
    const config = {
      contentDir: '/x',
      sections: {
        hero: { label: 'Hero', component: () => null, fields: { heading: f.text() }, thumbnail: '/h.png' },
      },
    }
    expect(serializeRegistry(config)).toEqual({
      hero: { label: 'Hero', thumbnail: '/h.png', deprecated: undefined, fields: { heading: { type: 'text' } } },
    })
  })
})

describe('screenFromSegments', () => {
  it('maps segments to a screen', () => {
    expect(screenFromSegments(undefined)).toEqual({ screen: 'pages' })
    expect(screenFromSegments([])).toEqual({ screen: 'pages' })
    expect(screenFromSegments(['pages'])).toEqual({ screen: 'editor', slug: '' })
    expect(screenFromSegments(['pages', 'about'])).toEqual({ screen: 'editor', slug: 'about' })
    expect(screenFromSegments(['pages', 'services', 'pricing'])).toEqual({ screen: 'editor', slug: 'services/pricing' })
  })
})

describe('editReducer', () => {
  const base: Page = {
    slug: 'about',
    title: 'About',
    position: 1,
    seo: {},
    sections: [
      { id: 's1', type: 'hero', props: { heading: 'Hi' } },
      { id: 's2', type: 'quote', props: { text: 'Q' } },
    ],
  }

  it('sets a section field without touching others', () => {
    const next = editReducer(base, { type: 'setSectionField', sectionId: 's1', key: 'heading', value: 'Yo' })
    expect(next.sections[0]!.props).toEqual({ heading: 'Yo' })
    expect(next.sections[1]).toBe(base.sections[1]) // untouched reference
    expect(base.sections[0]!.props.heading).toBe('Hi') // original not mutated
  })

  it('sets page fields including nested seo', () => {
    expect(editReducer(base, { type: 'setPageField', key: 'title', value: 'About Us' }).title).toBe('About Us')
    expect(editReducer(base, { type: 'setPageField', key: 'seo.title', value: 'T' }).seo.title).toBe('T')
    expect(editReducer(base, { type: 'setPageField', key: 'seo.description', value: 'D' }).seo.description).toBe('D')
  })

  it('adds a section with given id and props at the end', () => {
    const next = editReducer(base, { type: 'addSection', sectionType: 'hero', id: 's3', props: { heading: '' } })
    expect(next.sections.map((s) => s.id)).toEqual(['s1', 's2', 's3'])
    expect(next.sections[2]).toEqual({ id: 's3', type: 'hero', props: { heading: '' } })
  })

  it('removes a section', () => {
    expect(editReducer(base, { type: 'removeSection', sectionId: 's1' }).sections.map((s) => s.id)).toEqual(['s2'])
  })

  it('moves a section up and down within bounds', () => {
    expect(editReducer(base, { type: 'moveSection', sectionId: 's2', dir: 'up' }).sections.map((s) => s.id)).toEqual(['s2', 's1'])
    expect(editReducer(base, { type: 'moveSection', sectionId: 's1', dir: 'up' }).sections.map((s) => s.id)).toEqual(['s1', 's2']) // no-op at top
    expect(editReducer(base, { type: 'moveSection', sectionId: 's2', dir: 'down' }).sections.map((s) => s.id)).toEqual(['s1', 's2']) // no-op at bottom
  })
})
