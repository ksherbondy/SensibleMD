import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseSemanticDocument } from '../core/semantic-document';
import { ControlledResizeObserver, testPageGeometry } from './pagination-geometry';
import { startScenario } from './scenario';

const source = '# **Same**\n\nParagraph with [external](https://example.com) and ![picture](image.png).\n\n## Same\n\n> Quote\n\n- Item\n\n```txt\nCode\n```\n\n| A | B |\n| - | - |\n| one | two |\n\n---';

describe('reader surface extraction characterization', () => {
  it('preserves semantic IDs and exact reader, measurement and preview relationships', async () => {
    testPageGeometry.height = 10000;
    const model = parseSemanticDocument(source, 0);
    const s = await startScenario({ storage: { 'sensiblemd-document': source } });
    try {
      for (const mode of ['Scroll', 'Page', 'Spread', 'Split'] as const) {
        if (mode === 'Split') await s.enterMode(mode);
        else await s.setReadingLayout(mode);
        const root = document.querySelector<HTMLElement>(mode === 'Split' ? '.authoring-preview' : mode === 'Scroll' ? '.document-reader' : '.book-pages .book-page')!;
        for (const heading of model.headings) {
          expect(root.querySelector(`[id="${heading.id}"]`)).toHaveTextContent('Same');
        }
        for (const block of model.nodes.filter(n => n.type !== 'heading' && (mode !== 'Split' || n.type !== 'thematicBreak'))) {
          expect(root.querySelector(`[id="reader-node-${block.id}"]`), `${mode}: ${block.type}`).not.toBeNull();
        }
        for (const inline of model.navigableNodes.filter(n => n.type === 'image' || n.type === 'link')) {
          const element = inline.type === 'image' ? root.querySelector('img') : within(root).getByRole('link', { name: 'external' });
          if (mode === 'Split') expect(element).not.toHaveAttribute('id');
          else expect(element).toHaveAttribute('id', `reader-node-${inline.id}`);
        }
        expect(root.querySelector('img')).toHaveAttribute('src', 'image.png');
        expect(root.querySelector('img')).toHaveAttribute('alt', 'picture');
        if (mode === 'Scroll') {
          expect(root.parentElement).toHaveClass('scroll-reader');
          expect(root).toHaveAttribute('tabindex', '0');
          expect(root.children).toHaveLength(1);
          expect(root.firstElementChild).toHaveClass('reading-column');
          expect(root.querySelector('.scroll-navigation, footer')).toBeNull();
          expect(document.querySelector('.pagination-measurement')).toBeNull();
        } else if (mode === 'Split') {
          expect(root.parentElement).toHaveClass('editor-layout', 'split-layout');
          expect(root.previousElementSibling).toHaveClass('editor-shell');
          expect(document.querySelector('.pagination-measurement')).toBeNull();
          // Preview receives navigable nodes, which exclude thematic breaks.
          expect(root.querySelector('hr')).not.toHaveAttribute('id');
        } else {
          const viewport = document.querySelector('.book-pages')!;
          const measurement = document.querySelector<HTMLElement>('.pagination-measurement')!;
          expect(viewport.parentElement).toHaveClass('book-reader', mode === 'Page' ? 'single' : 'spread');
          expect(viewport).toHaveAttribute('aria-busy', 'false');
          expect(root.parentElement).toBe(viewport);
          expect(root.firstElementChild).toHaveClass('page-content');
          expect(root.firstElementChild).not.toHaveAttribute('tabindex');
          expect(viewport.nextElementSibling).toBe(measurement);
          expect(measurement.nextElementSibling).toHaveClass('page-controls');
          expect(measurement).toHaveAttribute('aria-hidden', 'true');
          expect(measurement).toHaveAttribute('inert');
          expect(screen.getAllByRole('article')).not.toContain(measurement);
          expect(measurement.firstElementChild).toHaveClass('page-content');
          const observed = new Set(ControlledResizeObserver.instances.flatMap(observer => [...observer.targets]));
          expect(observed.has(viewport)).toBe(true);
          expect(observed.has(viewport.parentElement!)).toBe(true);
          expect(observed.has(measurement.firstElementChild!)).toBe(true);
          expect(observed.has(measurement)).toBe(false);
          for (const element of root.querySelectorAll('[id]')) {
            const target = measurement.querySelector(`[id="measure-${element.id}"]`);
            expect(target, element.id).not.toBeNull();
          }
          for (const block of measurement.firstElementChild!.children) expect(observed.has(block)).toBe(true);
          const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
        expect(s.isDirty()).toBe(false);
      }
      expect(s.editorSource()).toBe(source);
    } finally { s.unmount(); }
  });

  it.each(['Scroll', 'Page', 'Spread', 'Split'] as const)('characterizes link defaults and internal callback behavior in %s', async mode => {
    testPageGeometry.height = 10000;
    const markdown = '# Start\n\n[external](https://example.com) [relative](missing.md) [fragment](#destination) [http](http://example.com) [mail](mailto:test@example.com) [unsafe](javascript:alert%281%29)\n\n## Destination\n\nEnd.';
    const s = await startScenario({ storage: { 'sensiblemd-document': markdown } });
    try {
      await s.clickOutlineHeading('Start');
      await s.settleNavigation();
      if (mode === 'Split') await s.enterMode(mode);
      else await s.setReadingLayout(mode);
      const root = document.querySelector<HTMLElement>(mode === 'Split' ? '.authoring-preview' : mode === 'Scroll' ? '.document-reader' : '.book-pages .book-page')!;
      const external = within(root).getByRole('link', { name: 'external' });
      if (mode === 'Split') {
        expect(external).not.toHaveAttribute('target');
        expect(external).not.toHaveAttribute('rel');
      } else {
        expect(external).toHaveAttribute('target', '_blank');
        expect(external).toHaveAttribute('rel', 'noreferrer noopener');
      }
      // Observe React's cancellation before preventing jsdom's unavailable navigation.
      for (const name of ['external', 'relative', 'http', 'mail', 'unsafe', 'fragment']) {
        const link = [...root.querySelectorAll('a')].find(a => a.textContent === name)!;
        let prevented: boolean | undefined;
        const captureDefault = (event: MouseEvent) => { prevented = event.defaultPrevented; event.preventDefault(); };
        document.addEventListener('click', captureDefault, { once: true });
        await act(async () => { link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
        expect(prevented, `${mode}: ${name}`).toBe(mode !== 'Split' && name !== 'external');
      }
      expect(root.querySelector('a[href^="javascript:"]')).toBeNull();
      await s.settleNavigation();
      expect(document.querySelector('.outline-item[aria-current="location"]')).toHaveTextContent(mode === 'Split' ? 'Start' : 'Destination');
      expect(s.currentMode()).toBe(mode === 'Split' ? 'Split' : 'Read');
      expect(s.isDirty()).toBe(false);
    } finally { s.unmount(); }
  });

  it.each(['Scroll', 'Page', 'Spread', 'Split'] as const)('keeps untrusted Markdown inert and GFM intact in %s', async mode => {
    testPageGeometry.height = 10000;
    const markdown = '# Safe\n\n<script>window.pwned = true</script>\n\n<img src="x" onerror="window.pwned=true">\n\n[bad](javascript:alert%281%29) ![bad image](javascript:alert%281%29)\n\n~~deleted~~ and **strong** with [reference][ref].\n\n- [x] Checked\n\n[ref]: https://example.com "Reference title"';
    const s = await startScenario({ storage: { 'sensiblemd-document': markdown } });
    try {
      if (mode === 'Split') await s.enterMode(mode);
      else await s.setReadingLayout(mode);
      const roots = [...document.querySelectorAll<HTMLElement>('.document-reader, .book-pages .book-page, .pagination-measurement, .authoring-preview')];
      expect(roots.length).toBeGreaterThan(0);
      for (const root of roots) {
        expect(root.querySelector('script, [onerror], [onclick], iframe')).toBeNull();
        expect(root.querySelector('[href^="javascript:"], [src^="javascript:"]')).toBeNull();
        expect(root.querySelector('del')).toHaveTextContent('deleted');
        expect(root.querySelector('strong')).toHaveTextContent('strong');
        expect(root.querySelector('input[type="checkbox"]')).toBeDisabled();
        expect(root.querySelector('input[type="checkbox"]')).toBeChecked();
        expect(within(root).getByText('reference')).toHaveAttribute('href', 'https://example.com');
        expect(within(root).getByText('reference')).toHaveAttribute('title', 'Reference title');
      }
      expect(localStorage.getItem('sensiblemd-document')).toBe(markdown);
      expect(s.isDirty()).toBe(false);
    } finally { s.unmount(); }
  });
});
