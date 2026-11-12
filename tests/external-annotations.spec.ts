// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { createAnnotationStore } from '../src/client/annotations/model.ts'
import { EXTERNAL_ANNOTATIONS_EVENT, registerExternalAnnotations, revealExternalAnnotation } from '../src/client/annotations/external.ts'
import { buildProtocolBlock, splitProtocolPrefix } from '../src/client/annotations/format.ts'
afterEach(() => localStorage.clear())
it('stores reader sources, updates retried captures, lists by session, and reopens the native editor', () => {
  const store = createAnnotationStore(() => 1, localStorage); const open = vi.fn(); const off = registerExternalAnnotations(store, open)
  const request = (detail: Record<string, unknown>) => { let result: Record<string, unknown> = {}; document.dispatchEvent(new CustomEvent(EXTERNAL_ANNOTATIONS_EVENT, { detail: { ...detail, reply: (reply: Record<string, unknown>) => { result = reply } } })); return result }
  const capture = { id: 'guest-1', sessionId: 's', text: 'literal </quote> & <tag>', note: 'first', source: { label: 'book.pdf · p.2', address: 'dsh-resource://file/session/s/book.pdf', page: 2, anchor: { exact: 'literal </quote> & <tag>', start: 40, prefix: 'before', suffix: 'after' } }, edit: false }
  const first = request({ action: 'add', capture }); request({ action: 'add', capture: { ...capture, note: 'second </note>' } })
  expect(store.list('s')).toHaveLength(1); expect(store.list('s')[0]?.note).toBe('second </note>'); expect(open).not.toHaveBeenCalled()
  expect(createAnnotationStore(() => 2, localStorage).list('s')[0]?.externalSource?.anchor).toEqual(capture.source.anchor)
  expect(request({ action: 'list', sessionId: 'other' }).items).toEqual([]); expect(request({ action: 'list', sessionId: 's' }).items).toHaveLength(1)
  expect(request({ action: 'remove', id: first.id, sessionId: 'other' }).accepted).toBe(false); expect(store.list('s')).toHaveLength(1)
  expect(request({ action: 'edit', id: first.id, sessionId: 'other' }).accepted).toBe(false); request({ action: 'edit', id: first.id, sessionId: 's' }); expect(open).toHaveBeenLastCalledWith(store.list('s')[0], { x: 24, y: 100 }, 'edit')
  store.setSubmission('s', { pending: true }); expect(request({ action: 'edit', id: first.id, sessionId: 's' }).accepted).toBe(false); store.setSubmission('s', { pending: false })
  const parsed = splitProtocolPrefix(buildProtocolBlock(store.listActive('s')))
  expect(parsed?.annotations[0]?.quote).toContain('literal </quote> & <tag>'); expect(parsed?.annotations[0]?.quote).toContain(capture.source.address); expect(parsed?.annotations[0]?.note).toBe('second </note>')
  const reveal = vi.fn(); document.addEventListener('dsh-sidenote:reveal-external:v1', reveal); revealExternalAnnotation(store.list('s')[0]!); expect(reveal).toHaveBeenCalledOnce(); document.removeEventListener('dsh-sidenote:reveal-external:v1', reveal)
  off(); expect(request({ action: 'probe' }).accepted).toBeUndefined()
})
it('deduplicates after reload and preserves sent snapshots when a guest sends newer edits', () => {
  let store = createAnnotationStore(() => 1, localStorage)
  let off = registerExternalAnnotations(store, vi.fn())
  const capture = { id: 'stable-guest', sessionId: 's', text: 'selected', note: 'original', source: { label: 'HTML' }, edit: false }
  const add = (value = capture) => { document.dispatchEvent(new CustomEvent(EXTERNAL_ANNOTATIONS_EVENT, { detail: { action: 'add', capture: value, reply: () => undefined } })) }
  add(); off(); store = createAnnotationStore(() => 2, localStorage); off = registerExternalAnnotations(store, vi.fn())
  add(); expect(store.list('s')).toHaveLength(1)
  store.markSent([store.list('s')[0]!.id]); store.setNote(store.list('s')[0]!.id, 'cannot rewrite sent'); expect(store.list('s')[0]?.note).toBe('original'); add(); expect(store.list('s')).toHaveLength(1)
  add({ ...capture, note: 'late input after send' }); expect(store.list('s')).toHaveLength(1); expect(store.listActive('s')).toHaveLength(0)
  add({ ...capture, id: 'new-selection', note: 'new after send' }); expect(store.list('s')).toHaveLength(2)
  expect(store.listActive('s')[0]?.note).toBe('new after send'); expect(store.list('s')[0]?.note).toBe('original')
  off()
})
it('deletes by capture identity before ack, retries deletion, and never resurrects removed input', () => {
  const store = createAnnotationStore(() => 1, null); const off = registerExternalAnnotations(store, vi.fn())
  const request = (detail: Record<string, unknown>) => { let result: Record<string, unknown> = {}; document.dispatchEvent(new CustomEvent(EXTERNAL_ANNOTATIONS_EVENT, { detail: { ...detail, reply: (reply: Record<string, unknown>) => { result = reply } } })); return result }
  const capture = { id: 'race', sessionId: 'a', text: 'source', note: 'draft', source: { label: 'web' }, edit: false }
  request({ action: 'add', capture }); request({ action: 'add', capture: { ...capture, sessionId: 'b' } })
  const remove = { action: 'remove', sessionId: 'a', captureId: 'race' }
  store.setSubmission('a', { pending: true }); expect(request(remove).accepted).toBe(false); expect(store.listActive('a')).toHaveLength(1)
  store.setSubmission('a', { pending: false }); expect(request(remove).accepted).toBe(true); expect(request(remove).accepted).toBe(true)
  request({ action: 'add', capture: { ...capture, note: 'stale retry' } }); expect(store.list('a')).toHaveLength(0); expect(store.listActive('b')).toHaveLength(1)
  expect(request({ action: 'remove', sessionId: 'a', captureId: 'not-yet-arrived' }).accepted).toBe(true)
  request({ action: 'add', capture: { ...capture, id: 'not-yet-arrived' } }); expect(store.list('a')).toHaveLength(0)
  off()
})
