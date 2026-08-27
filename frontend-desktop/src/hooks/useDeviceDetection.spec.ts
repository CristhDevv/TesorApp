import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeviceDetection } from './useDeviceDetection';

describe('useDeviceDetection hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debe permitir cambiar modo de dispositivo mediante setOverride', () => {
    const { result } = renderHook(() => useDeviceDetection());

    act(() => {
      result.current.setOverride('mobile');
    });
    expect(result.current.deviceMode).toBe('mobile');
    expect(result.current.isMobile).toBe(true);

    act(() => {
      result.current.setOverride('desktop');
    });
    expect(result.current.deviceMode).toBe('desktop');
    expect(result.current.isMobile).toBe(false);

    act(() => {
      result.current.setOverride('auto');
    });
    expect(result.current.deviceMode).toBe('auto');
  });
});
