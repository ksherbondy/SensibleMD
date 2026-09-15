import { screen, waitFor, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { startScenario } from './scenario';

const activeHeading = () => document.querySelector('.outline-item[aria-current="location"]');
const documentId = () => document.querySelector('.app-shell')!.getAttribute('data-document-id');

it('preserves sidebar DOM, heading order/levels, active state, keyboard focus and collapse controls', async () => {
  const source = 'Preamble.\n\n# First\n\n## **Second**\n\n### Third\n\n#### Fourth\n\n##### Fifth\n\n###### Sixth';
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    const aside = screen.getByRole('complementary', { name: 'Document outline' });
    expect(aside).toHaveClass('outline-panel');
    expect(aside.parentElement).toHaveClass('workspace');
    expect(aside.parentElement!.firstElementChild).toBe(aside);
    expect(aside.nextElementSibling).toHaveClass('main-area');
    expect([...aside.children].map(e => [e.tagName, e.className])).toEqual([
      ['DIV', 'panel-heading'], ['NAV', ''], ['DIV', 'outline-footer'],
    ]);
    expect(aside.querySelector('.panel-heading > span')).toHaveTextContent('Outline');
    expect(within(aside).queryByRole('navigation', { name: 'Collection chapters' })).toBeNull();
    const headings = [...aside.querySelectorAll<HTMLButtonElement>('.outline-item')];
    expect(headings.map(b => b.textContent)).toEqual(['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth']);
    expect(activeHeading()).toBeNull();
    const close = within(aside).getByRole('button', { name: 'Close outline' });
    expect(close).toHaveAttribute('type', 'button');
    expect(close).toHaveClass('icon-button', 'small');
    close.focus();
    for (const [index, heading] of headings.entries()) {
      expect(heading).toHaveAttribute('type', 'button');
      expect(heading.className).toBe(`outline-item level-${index + 1} `);
      expect(heading).not.toHaveAttribute('aria-current');
      expect(heading).toBeEnabled();
      await s.user.tab();
      expect(heading).toHaveFocus();
    }
    await s.user.keyboard('{Enter}');
    await s.settleNavigation();
    expect(activeHeading()).toBe(headings[5]);
    expect(headings[5]).toHaveClass('active');
    expect(headings[5]).toHaveFocus();
    expect(s.currentMode()).toBe('Read');
    expect(aside.querySelector('.outline-footer')!.children).toHaveLength(2);
    expect(aside.querySelector('.outline-footer')).toHaveTextContent('13 words6 sections');
    await s.user.click(close);
    expect(aside).toHaveClass('collapsed');
    expect(aside.parentElement).toHaveClass('outline-closed');
    const open = screen.getByRole('button', { name: 'Open outline' });
    expect(open.parentElement).toHaveClass('reader-toolbar');
    await s.user.click(open);
    expect(aside).not.toHaveClass('collapsed');
    expect(aside.parentElement).not.toHaveClass('outline-closed');
    expect(screen.queryByRole('button', { name: 'Open outline' })).toBeNull();
    expect(screen.getByRole('complementary', { name: 'Document outline' })).toBe(aside);
    expect(activeHeading()).toBe(headings[5]);
  } finally { s.unmount(); }
});

it('updates the same outline after edits and renders the existing headingless empty state', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': 'Plain text.' } });
  try {
    const aside = screen.getByRole('complementary', { name: 'Document outline' });
    expect(within(aside).getByText('Headings will appear here.')).toHaveClass('empty-state');
    expect(activeHeading()).toBeNull();
    expect(aside.querySelector('.outline-footer')).toHaveTextContent('2 words0 sections');
    await s.enterMode('Write');
    await s.setEditorSource('# Added\n\n## Child');
    expect(s.outlineHeadings()).toEqual(['Added', 'Child']);
    await s.clickOutlineHeading('Child');
    expect(activeHeading()).toHaveTextContent('Child');
    expect(s.currentMode()).toBe('Write');
    await s.setEditorSource('Only prose now.');
    expect(s.outlineHeadings()).toEqual([]);
    expect(activeHeading()).toBeNull();
    expect(within(aside).getByText('Headings will appear here.')).toBeInTheDocument();
    expect(aside.querySelector('.outline-footer')).toHaveTextContent('3 words0 sections');
    expect(screen.getByRole('complementary', { name: 'Document outline' })).toBe(aside);
  } finally { s.unmount(); }
});

it.each([false, true])('preserves sidebar switching, identity, memory and history with dirty=%s', async dirty => {
  const s = await startScenario();
  try {
    const input = document.querySelector<HTMLInputElement>('input[multiple]')!;
    await s.user.upload(input, [
      new File(['No headings here.'], 'B.md', { type: 'text/markdown' }),
      new File(['# First\n\n## Second'], 'A.md', { type: 'text/markdown' }),
    ]);
    await waitFor(() => expect(s.documentName()).toBe('A.md'));
    const firstId = documentId();
    const aside = screen.getByRole('complementary', { name: 'Document outline' });
    const chapters = within(aside).getByRole('navigation', { name: 'Collection chapters' });
    expect([...aside.children].map(e => e.className)).toEqual(['panel-heading', 'chapter-list', '', 'outline-footer']);
    expect(aside.querySelector('.panel-heading > span')).toHaveTextContent('Chapters · 2');
    expect(s.chapterNames()).toEqual(['A.md', 'B.md']);
    const buttons = within(chapters).getAllByRole('button');
    expect(buttons.map(b => b.textContent)).toEqual(['01A.md', '02B.md']);
    for (const button of buttons) {
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toHaveAttribute('aria-current');
      expect(button).toBeEnabled();
    }
    expect(buttons[0]).toHaveClass('active');
    expect(buttons[1]).not.toHaveClass('active');
    await s.clickOutlineHeading('First');
    await s.clickOutlineHeading('Second');
    await s.user.click(screen.getByRole('button', { name: 'Bookmark' }));
    const savedHeading = activeHeading()!.textContent;
    await s.enterMode('Write');
    if (dirty) await s.appendToEditor('\n\nEdited.');
    await s.switchChapter('A.md'); // Active-document click remains a no-op.
    expect(s.currentMode()).toBe('Write');
    expect(s.isDirty()).toBe(dirty);
    buttons[0].focus();
    await s.user.tab();
    expect(buttons[1]).toHaveFocus();
    await s.user.keyboard('{Enter}');
    await s.settleNavigation();
    expect(s.documentName()).toBe('B.md');
    expect(documentId()).not.toBe(firstId);
    expect(s.currentMode()).toBe('Read');
    expect(s.isDirty()).toBe(false);
    expect(buttons[1]).toHaveFocus();
    expect(buttons[1]).toHaveClass('active');
    expect(buttons[0]).not.toHaveClass('active');
    expect(activeHeading()).toBeNull();
    expect(s.outlineHeadings()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('sensiblemd-bookmarks')!)).toEqual([]);
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await s.switchChapter('A.md');
    await s.settleNavigation();
    expect(documentId()).toBe(firstId);
    expect(activeHeading()).toHaveTextContent(savedHeading!);
    expect(screen.getByRole('button', { name: 'Bookmark' })).toHaveClass('saved-bookmark');
    expect(localStorage.getItem('sensiblemd-document')).toBe('# First\n\n## Second' + (dirty ? '\n\nEdited.' : ''));
    await s.user.click(screen.getByRole('button', { name: 'Go back' }));
    expect(s.documentName()).toBe('A.md');
    expect(activeHeading()).toHaveTextContent('First');
    await s.user.click(screen.getByRole('button', { name: 'Go forward' }));
    expect(s.documentName()).toBe('A.md');
    expect(activeHeading()).toHaveTextContent('Second');
  } finally { s.unmount(); }
});
