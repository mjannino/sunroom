'use client'
import type { Page } from '../../store/types.js'
import type { EditorActions, SerializedRegistry } from './types.js'

export function PageEditor(_: {
  page: Page
  version: string
  registry: SerializedRegistry
  actions: EditorActions
}): React.ReactElement {
  return <div data-screen="editor">editor</div>
}
