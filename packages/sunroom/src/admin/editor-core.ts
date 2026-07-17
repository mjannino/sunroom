import type { FieldDescriptor, FieldMap } from '../core/fields.js'
import type { SunroomConfig } from '../core/registry.js'
import { paramsToSlug } from '../store/paths.js'
import type { Page } from '../store/types.js'
import type { SerializedRegistry } from './editor/types.js'

function defaultForField(field: FieldDescriptor): unknown {
  if ('default' in field && field.default !== undefined) return field.default
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'richText':
    case 'link':
      return ''
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'select':
      return field.options[0]?.value ?? ''
    case 'image':
      return undefined
    case 'object':
      return defaultProps(field.fields)
    case 'array':
      return []
  }
}

export function defaultProps(fields: FieldMap): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(fields)) out[key] = defaultForField(field)
  return out
}

export function serializeRegistry(config: SunroomConfig): SerializedRegistry {
  const out: SerializedRegistry = {}
  for (const [type, def] of Object.entries(config.sections)) {
    out[type] = { label: def.label, thumbnail: def.thumbnail, deprecated: def.deprecated, fields: def.fields }
  }
  return out
}

export function screenFromSegments(
  segments: string[] | undefined,
): { screen: 'pages' } | { screen: 'editor'; slug: string } {
  const seg = segments ?? []
  if (seg.length === 0) return { screen: 'pages' }
  if (seg[0] === 'pages') return { screen: 'editor', slug: paramsToSlug(seg.slice(1)) }
  return { screen: 'pages' }
}

export type EditAction =
  | { type: 'setSectionField'; sectionId: string; key: string; value: unknown }
  | { type: 'setPageField'; key: 'title' | 'seo.title' | 'seo.description'; value: string }
  | { type: 'addSection'; sectionType: string; id: string; props: Record<string, unknown> }
  | { type: 'removeSection'; sectionId: string }
  | { type: 'moveSection'; sectionId: string; dir: 'up' | 'down' }

export function editReducer(page: Page, action: EditAction): Page {
  switch (action.type) {
    case 'setSectionField':
      return {
        ...page,
        sections: page.sections.map((s) =>
          s.id === action.sectionId ? { ...s, props: { ...s.props, [action.key]: action.value } } : s,
        ),
      }
    case 'setPageField':
      if (action.key === 'title') return { ...page, title: action.value }
      if (action.key === 'seo.title') return { ...page, seo: { ...page.seo, title: action.value } }
      return { ...page, seo: { ...page.seo, description: action.value } }
    case 'addSection':
      return { ...page, sections: [...page.sections, { id: action.id, type: action.sectionType, props: action.props }] }
    case 'removeSection':
      return { ...page, sections: page.sections.filter((s) => s.id !== action.sectionId) }
    case 'moveSection': {
      const i = page.sections.findIndex((s) => s.id === action.sectionId)
      if (i < 0) return page
      const j = action.dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= page.sections.length) return page
      const sections = [...page.sections]
      ;[sections[i], sections[j]] = [sections[j]!, sections[i]!]
      return { ...page, sections }
    }
  }
}
