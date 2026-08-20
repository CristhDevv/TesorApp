import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md animate-fade-in">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Sin conexión a Internet. Las modificaciones no se guardarán hasta reconectar.</span>
    </div>
  );
}
