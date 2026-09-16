import { fireEvent, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { startScenario } from './scenario';

const trigger = () => screen.getByRole('button', { name: 'Reading settings' });
const panel = () => screen.getByRole('region', { name: 'Reading settings' });

it('preserves settings DOM, labels, input bounds/steps, tab order and parent containment/dismissal', async () => {
  const s = await startScenario();
  try {
    expect(screen.queryByRole('region', { name: 'Reading settings' })).toBeNull();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await s.user.click(trigger());
    const region = panel();
    expect(region).toHaveClass('settings-popover');
    expect(region.parentElement).toHaveClass('main-area');
    expect(region.previousElementSibling).toHaveClass('reader-toolbar');
    expect([...region.children].map(e => [e.tagName, e.className])).toEqual([
      ['LABEL', ''], ['LABEL', ''], ['LABEL', ''], ['LABEL', 'toggle-setting'],
    ]);
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    const sliders = within(region).getAllByRole('slider');
    const expected = [
      ['Text size 100%', '85', '150', null, '100'],
      ['Line spacing 1.72', '1.3', '2.4', '0.05', '1.72'],
      ['Content width 760px', '480', '1040', '20', '760'],
    ];
    for (const [i, slider] of sliders.entries()) {
      const [label, min, max, step, value] = expected[i];
      // Existing output-first implicit labels do not give the slider an accessible name.
      expect(slider.parentElement).toHaveTextContent(label!);
      expect(slider).toHaveAccessibleName('');
      expect(slider).toHaveAttribute('type', 'range');
      expect(slider).toHaveAttribute('min', min);
      expect(slider).toHaveAttribute('max', max);
      expect(slider.getAttribute('step')).toBe(step);
      expect(slider).toHaveValue(value);
      expect([...slider.parentElement!.children].map(e => e.tagName)).toEqual(['OUTPUT', 'INPUT']);
    }
    const motion = within(region).getByRole('checkbox', { name: 'Reduce motion' });
    expect(motion).not.toBeChecked();
    expect(region.contains(screen.getByRole('group', { name: 'Reading layout' }))).toBe(false);
    await s.user.click(sliders[0]);
    expect(panel()).toBe(region); // Pointer events inside the passed panel ref do not dismiss it.
    for (const control of [sliders[1], sliders[2], motion]) {
      await s.user.tab(); expect(control).toHaveFocus();
    }
    await s.user.keyboard('{Escape}');
    expect(region).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await s.user.click(trigger());
    await s.user.click(screen.getByRole('textbox', { name: 'Search document' }));
    expect(screen.queryByRole('region', { name: 'Reading settings' })).toBeNull();
    await s.user.click(trigger());
    await s.user.click(trigger());
    expect(screen.queryByRole('region', { name: 'Reading settings' })).toBeNull();
  } finally { s.unmount(); }
});

it.each(['Read', 'Split'] as const)('updates displayed preferences, shared shell and persisted values in %s without changing the semantic target', async mode => {
  const s = await startScenario({ storage: { 'sensiblemd-document': '# First\n\nFirst text.\n\n## Second\n\nSecond text.' } });
  try {
    await s.clickOutlineHeading('Second');
    await s.enterMode(mode);
    await s.user.click(trigger());
    const region = panel();
    const sliders = within(region).getAllByRole('slider');
    for (const [i, value] of ['125', '2.1', '900'].entries()) {
      fireEvent.change(sliders[i], { target: { value } });
      await s.settle();
    }
    await s.user.click(within(region).getByRole('checkbox', { name: 'Reduce motion' }));
    expect([...region.querySelectorAll('output')].map(e => e.textContent)).toEqual(['125%', '2.10', '900px']);
    const shell = document.querySelector<HTMLElement>('.app-shell')!;
    expect(shell.style.getPropertyValue('--reader-scale')).toBe('125%');
    expect(shell.style.getPropertyValue('--reader-line-height')).toBe('2.1');
    expect(shell.style.getPropertyValue('--reader-width')).toBe('900px');
    expect(shell).toHaveClass('reduced-motion');
    expect(shell.contains(document.querySelector(mode === 'Split' ? '.authoring-preview' : '.document-reader'))).toBe(true);
    expect(s.currentMode()).toBe(mode);
    expect(document.querySelector('.outline-item[aria-current="location"]')).toHaveTextContent('Second');
    expect(s.isDirty()).toBe(false);
    for (const [key, value] of [['font-scale', '125'], ['line-height', '2.1'], ['content-width', '900'], ['reduced-motion', 'true']]) {
      expect(localStorage.getItem(`sensiblemd-${key}`)).toBe(value);
    }
  } finally { s.unmount(); }
  const reopened = await startScenario();
  try {
    await reopened.user.click(trigger());
    expect([...panel().querySelectorAll('output')].map(e => e.textContent)).toEqual(['125%', '2.10', '900px']);
    expect(within(panel()).getByRole('checkbox', { name: 'Reduce motion' })).toBeChecked();
  } finally { reopened.unmount(); }
});
