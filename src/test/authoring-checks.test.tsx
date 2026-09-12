import { screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { startScenario } from './scenario';

const source = '# Document\n\n### Skipped level\n\n![](image.png)\n\nText.';
it('one checks panel owns filters and preserves filter/collapse state across Write and Split', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    await s.enterMode('Write');
    const panel = screen.getByRole('complementary', { name: 'Authoring checks' });
    expect(panel).toContainElement(screen.getByRole('navigation', { name: 'Diagnostic severity filter' }));
    await s.user.click(within(panel).getByRole('button', { name: 'Warnings' }));
    const findings = panel.querySelectorAll('.finding').length;
    expect(findings).toBeGreaterThan(0);
    await s.user.click(screen.getByRole('button', { name: 'Hide authoring checks' }));
    expect(panel).not.toBeVisible();
    const restore = screen.getByRole('button', { name: 'Show authoring checks' });
    expect(restore).toHaveFocus();
    await s.enterMode('Split');
    expect(panel).not.toBeVisible();
    await s.user.click(screen.getByRole('button', { name: 'Show authoring checks' }));
    expect(panel).toBeVisible();
    expect(within(panel).getByRole('button', { name: 'Warnings' })).toHaveAttribute('aria-pressed', 'true');
    expect(panel.querySelectorAll('.finding')).toHaveLength(findings);
    expect(screen.getByRole('button', { name: 'Hide authoring checks' })).toHaveFocus();
    const finding = panel.querySelector<HTMLButtonElement>('.finding')!;
    const line = Number(finding.querySelector('small')!.textContent!.replace('Line ', ''));
    await s.user.click(finding); await s.settleNavigation();
    expect(s.editorCursorLine()).toBe(line);
    await s.user.click(screen.getByRole('button', { name: 'Hide authoring checks' }));
    await s.enterMode('Write');
    expect(panel).not.toBeVisible();
    expect(s.editorSource()).toBe(source); expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); }
});
