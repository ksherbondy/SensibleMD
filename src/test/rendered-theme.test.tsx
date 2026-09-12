import { expect, it } from 'vitest';
import { startScenario } from './scenario';
import { testPageGeometry } from './pagination-geometry';

const source = '# Theme\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six\n\nParagraph **strong** and *emphasis* with `inline` and [link](https://example.com).\n\n- Unordered\n\n1. Ordered\n\n> Quotation\n\n```txt\ncode sample\n```\n\n---\n\n| A | B |\n| - | - |\n| one | two |';
it('every rendered view and pagination measurement use the same Markdown theme', async () => {
  testPageGeometry.height = 10000;
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    for (const mode of ['Scroll', 'Page', 'Spread', 'Split'] as const) {
      if (mode === 'Split') await s.enterMode('Split');
      else await s.setReadingLayout(mode);
      const root = document.querySelector(mode === 'Split' ? '.authoring-preview' : mode === 'Scroll' ? '.document-reader' : '.book-pages .book-page')!;
      expect(root).toHaveClass('rendered-markdown');
      for (const selector of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote', 'pre code', 'p code', 'strong', 'em', 'a', 'hr', 'table']) {
        expect(root.querySelector(selector), `${mode}: ${selector}`).not.toBeNull();
      }
      if (mode === 'Page' || mode === 'Spread') expect(document.querySelector('.pagination-measurement')).toHaveClass('rendered-markdown');
      expect(s.isDirty()).toBe(false);
    }
  } finally { s.unmount(); }
});
