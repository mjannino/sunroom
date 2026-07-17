'use client'
import type { PageSummary } from '../../store/types.js'
import type { EditorActions } from './types.js'

export function PagesScreen(_: { pages: PageSummary[]; actions: EditorActions }): React.ReactElement {
  return <div data-screen="pages">pages</div>
}
