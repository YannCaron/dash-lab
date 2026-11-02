import { describe, expect, it } from 'vitest';
import { validatePanels } from './panels.js';
import type { WorkbenchPanel } from './panels.js';

const first: WorkbenchPanel = { id: 'first', title: 'First panel', component: () => null };

describe('initial panel definitions', () => {
  it('accepts empty workspaces and references to earlier panels', () => {
    expect(() => validatePanels([])).not.toThrow();
    expect(() => validatePanels([first, { ...first, id: 'second', position: { referencePanel: 'first', direction: 'right' } }])).not.toThrow();
  });

  it('rejects duplicate identifiers and unresolved placement references', () => {
    expect(() => validatePanels([first, first])).toThrow('Duplicate panel identifier');
    expect(() => validatePanels([{ ...first, position: { referencePanel: 'missing', direction: 'within' } }])).toThrow('earlier panel');
  });

  it('rejects blank identifiers, blank titles, and invalid dimensions', () => {
    expect(() => validatePanels([{ ...first, id: ' ' }])).toThrow('must not be empty');
    expect(() => validatePanels([{ ...first, title: '' }])).toThrow('must not be empty');
    for (const initialWidth of [0, -1, NaN, Infinity]) expect(() => validatePanels([{ ...first, initialWidth }])).toThrow('positive finite');
  });
});
