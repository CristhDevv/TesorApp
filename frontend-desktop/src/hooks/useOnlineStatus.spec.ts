import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus hook', () => {
  it('debe responder a eventos online y offline del navegador', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(typeof result.current).toBe('boolean');

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});
