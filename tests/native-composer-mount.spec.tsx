/** @vitest-environment jsdom */
import { act, createElement, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { registerNativeComposer } from '../src/client/annotations/NativeComposer.tsx'
import { createAnnotationStore } from '../src/client/annotations/model.ts'
import { createReflowStore } from '../src/client/reflow.ts'
import type { Context } from '../src/client/host/contracts.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
it('mounts the context-only action when native controls arrive later and removes it cleanly', async () => {
  const store = createAnnotationStore(() => 1, null)
  store.add({ sessionId: 's', text: 'quote', anchorText: 'quote', anchorKey: undefined, occurrence: 0, note: 'note' })
  const entry = { component: (() => createElement('div', { 'data-composer-card': true })) as ComponentType<any> }
  let dispose = () => {}
  const slots = { entries: () => [entry], subscribe: () => () => {}, inject: (_name: string, install: () => () => void) => { dispose = install() } }
  const original = entry.component
  registerNativeComposer({ slots } as unknown as Context, store, createReflowStore(() => 1, null))
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container)
  const props = { sessionId: 's', variant: 'main', keyboard: { submit: vi.fn() }, inputActions: {}, useInput: (select: any) => select({ draft: '', phase: 'plain', attachmentIds: [] }), useSession: (select: any) => select({ running: false }), useBusyEnter: (select: any) => select('queue'), t: (key: string) => key }
  try {
    await act(async () => { root.render(createElement(entry.component, props)) })
    expect(container.querySelector('[data-sidenote-submit]')).toBeNull()
    const native = document.createElement('button'); native.disabled = true
    await act(async () => { container.querySelector('[data-composer-card]')!.append(native); await Promise.resolve() })
    expect(container.querySelectorAll('[data-sidenote-submit]')).toHaveLength(1)
    expect(native.hasAttribute('data-sidenote-context-replaced')).toBe(true)
    await act(async () => { root.render(createElement(entry.component, { ...props, useAccess: () => false })) })
    expect(container.querySelector<HTMLButtonElement>('[data-sidenote-submit]')?.disabled).toBe(true)
    const unrelated = document.createElement('span')
    await act(async () => { container.append(unrelated); await Promise.resolve() })
    expect(container.querySelectorAll('[data-sidenote-submit]')).toHaveLength(1)
  } finally { await act(async () => { root.unmount() }); dispose(); container.remove() }
  expect(entry.component).toBe(original); expect(document.querySelector('[data-sidenote-submit]')).toBeNull()
})
