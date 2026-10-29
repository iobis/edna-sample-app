import { describe, expect, it } from 'vitest';
import { sanitizeCoordinateDraft, toggleCoordinateDraft } from './coordinateInput';

describe('sanitizeCoordinateDraft', () => {
  it('moves a trailing minus to the front', () => {
    expect(sanitizeCoordinateDraft('51.2-')).toBe('-51.2');
    expect(sanitizeCoordinateDraft('51,25-')).toBe('-51.25');
  });

  it('keeps a leading minus and a decimal comma', () => {
    expect(sanitizeCoordinateDraft('-')).toBe('-');
    expect(sanitizeCoordinateDraft('-51,25')).toBe('-51.25');
    expect(sanitizeCoordinateDraft('-.5')).toBe('-.5');
  });

  it('drops letters and extra decimal points', () => {
    expect(sanitizeCoordinateDraft('12.3.4')).toBe('12.34');
    expect(sanitizeCoordinateDraft('abc')).toBe('');
    expect(sanitizeCoordinateDraft('+51.2')).toBe('51.2');
  });
});

describe('toggleCoordinateDraft', () => {
  it('adds a minus to an empty or positive draft', () => {
    expect(toggleCoordinateDraft('')).toBe('-');
    expect(toggleCoordinateDraft('51.2')).toBe('-51.2');
  });

  it('removes an existing minus', () => {
    expect(toggleCoordinateDraft('-')).toBe('');
    expect(toggleCoordinateDraft('-51.2')).toBe('51.2');
    expect(toggleCoordinateDraft('51.2-')).toBe('51.2');
  });
});
