import { useState, useEffect } from 'react';

export type DeviceMode = 'auto' | 'mobile' | 'desktop';

export function useDeviceDetection() {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>(() => {
    return (localStorage.getItem('tesorapp_device_override') as DeviceMode) || 'auto';
  });

  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isSmall = window.innerWidth < 768;
    const isTouch = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isSmall || (isTouch && window.innerWidth < 1024);
  });

  useEffect(() => {
    const handleResize = () => {
      const isSmall = window.innerWidth < 768;
      const isTouch = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsMobileScreen(isSmall || (isTouch && window.innerWidth < 1024));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setOverride = (mode: DeviceMode) => {
    setDeviceMode(mode);
    if (mode === 'auto') {
      localStorage.removeItem('tesorapp_device_override');
    } else {
      localStorage.setItem('tesorapp_device_override', mode);
    }
  };

  const isMobile = deviceMode === 'mobile' ? true : deviceMode === 'desktop' ? false : isMobileScreen;

  return {
    isMobile,
    deviceMode,
    setOverride,
  };
}
