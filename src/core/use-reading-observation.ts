import { useLayoutEffect, useRef, useState } from 'react'
import { parseSemanticDocument } from './semantic-document'

interface ObservationOptions {
  documentId: string
  source: string
  enabled: boolean
  revision: number
  onObserve: (nodeId: string) => void
  work: { interruptCurrentContext: () => void; capture: () => () => boolean }
}

// Observation never projects. Each effect lifetime is a document/source/surface/
// explicit-navigation generation; even callbacks delivered after disconnect die.
export function useReadingObservation({ documentId, source, enabled, revision, onObserve, work }: ObservationOptions) {
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight)
  useLayoutEffect(() => {
    const resize = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const commit = useRef(onObserve)
  useLayoutEffect(() => { commit.current = onObserve })
  useLayoutEffect(() => {
    if (!enabled) return
    const surface = document.querySelector('.document-reader')
    if (!surface) return
    const nodes = parseSemanticDocument(source, 0).nodes
    const targets = nodes.flatMap((node) => {
      const element = surface.querySelector(`[id="${node.type === 'heading' ? node.id : `reader-node-${node.id}`}"]`)
      return element ? [{ element, nodeId: node.id }] : []
    })
    let isCurrent = work.capture()
    let alive = true
    let armed = false
    let scrolled = false
    let inputTime = 0
    const visible = new Map<Element, IntersectionObserverEntry>()
    const observer = new IntersectionObserver((entries) => {
      if (!alive || !isCurrent() || !armed || !scrolled) return
      for (const entry of entries) {
        if (entry.time < inputTime) continue
        if (entry.isIntersecting) visible.set(entry.target, entry)
        else visible.delete(entry.target)
      }
      // The observer's narrow band is 15–20% down the scrollport. Prefer a
      // block crossing its top, then the nearest block below; source order breaks
      // ties. Entries are synthetic in tests, never a claim about jsdom layout.
      const candidates = targets.filter((target) => visible.has(target.element))
      candidates.sort((a, b) => {
        const distance = (element: Element) => {
          const entry = visible.get(element)!
          const top = entry.rootBounds?.top ?? 0
          return entry.boundingClientRect.top <= top && entry.boundingClientRect.bottom >= top ? 0 : Math.abs(entry.boundingClientRect.top - top)
        }
        return distance(a.element) - distance(b.element)
      })
      if (candidates[0]) { commit.current(candidates[0].nodeId); isCurrent = work.capture() }
    }, { root: null, rootMargin: `-${viewportHeight * 0.15}px 0px -${viewportHeight * 0.8}px 0px`, threshold: 0 })
    for (const target of targets) observer.observe(target.element)
    const arm = () => { work.interruptCurrentContext(); isCurrent = work.capture(); armed = true; scrolled = false; inputTime = performance.now(); visible.clear(); observer.takeRecords() }
    const key = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable="true"]')) return
      if (event instanceof KeyboardEvent && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) arm()
    }
    const scroll = (event: Event) => {
      // Continuous reading currently scrolls the document, not the article.
      // Ignore independently scrolling descendants such as code blocks/outline.
      if (!armed || ![document, document.documentElement, surface].includes(event.target as Document | Element)) return
      if (!scrolled) {
        scrolled = true
        observer.disconnect()
        for (const target of targets) observer.observe(target.element)
      }
    }
    const scrollbar = (event: Event) => {
      if (event.target === document.documentElement) arm()
    }
    surface.addEventListener('wheel', arm, { passive: true })
    surface.addEventListener('touchmove', arm, { passive: true })
    surface.addEventListener('pointerdown', arm)
    window.addEventListener('keydown', key)
    document.addEventListener('pointerdown', scrollbar)
    document.addEventListener('scroll', scroll, true)
    return () => {
      alive = false
      observer.disconnect()
      surface.removeEventListener('wheel', arm)
      surface.removeEventListener('touchmove', arm)
      surface.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', key)
      document.removeEventListener('pointerdown', scrollbar)
      document.removeEventListener('scroll', scroll, true)
    }
  }, [documentId, source, enabled, revision, viewportHeight, work])
}
