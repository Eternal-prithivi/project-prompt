import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('useNetworkStatus', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    // Save original
    originalOnLine = navigator.onLine;
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    // Restore original
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
    vi.restoreAllMocks();
  });

  it('should initialize with current navigator.onLine status (true)', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true);
  });

  it('should initialize with current navigator.onLine status (false)', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(false);
  });

  it('should update status when offline event fires', () => {
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current).toBe(true);
    
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current).toBe(false);
  });

  it('should update status when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current).toBe(false);
    
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });
    
    expect(result.current).toBe(true);
  });
});
