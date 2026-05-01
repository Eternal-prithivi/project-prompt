import { describe, expect, it } from 'vitest';
import { safeErrorMessage } from '../../services/utils/errors';

describe('safeErrorMessage', () => {
  it('returns raw strings unchanged', () => {
    expect(safeErrorMessage('plain string error')).toBe('plain string error');
  });

  it('returns the message from Error objects', () => {
    expect(safeErrorMessage(new Error('Boom'))).toBe('Boom');
  });

  it('reads message and error fields from plain objects', () => {
    expect(safeErrorMessage({ message: 'Object message' })).toBe('Object message');
    expect(safeErrorMessage({ error: 'Object error' })).toBe('Object error');
  });

  it('falls back to the default message when nothing useful is available', () => {
    expect(safeErrorMessage({})).toBe('An unexpected error occurred');
    expect(safeErrorMessage(null)).toBe('An unexpected error occurred');
  });
});
