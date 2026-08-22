// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getFocusableElements, trapTabFocus } from '../../src/app/dialogUtils';

describe('dialogUtils', () => {
  it('finds focusable elements inside a container', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <button type="button" id="first">First</button>
      <input type="text" id="middle" />
      <button type="button" id="last">Last</button>
      <button type="button" disabled>Disabled</button>
    `;
    document.body.appendChild(root);

    const focusable = getFocusableElements(root);
    expect(focusable).toHaveLength(3);
    expect(focusable[0].id).toBe('first');
    expect(focusable[2].id).toBe('last');

    root.remove();
  });

  it('wraps focus from last to first on Tab', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <button type="button" id="a">A</button>
      <button type="button" id="b">B</button>
    `;
    document.body.appendChild(root);
    const [first, last] = getFocusableElements(root);
    last.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const prevented = trapTabFocus(event, root);
    expect(prevented).toBe(true);
    expect(document.activeElement).toBe(first);

    root.remove();
  });
});
