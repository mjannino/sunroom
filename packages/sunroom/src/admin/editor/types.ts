import type { FieldMap } from '../../core/fields.js'
import type { Page } from '../../store/types.js'

export type ActionResult =
  | { ok: true; version?: string }
  | { ok: false; reason: 'unauthorized' | 'conflict' | 'validation' | 'notfound'; message: string }

export interface SerializedSection {
  label: string
  thumbnail?: string
  deprecated?: boolean
  fields: FieldMap
}
export type SerializedRegistry = Record<string, SerializedSection>

export interface EditorActions {
  savePage(page: Page, baseVersion: string | null): Promise<ActionResult>
  createPage(input: { slug: string; title: string }): Promise<ActionResult>
  deletePage(slug: string): Promise<ActionResult>
  reorderPages(orderedSlugs: string[]): Promise<ActionResult>
}
