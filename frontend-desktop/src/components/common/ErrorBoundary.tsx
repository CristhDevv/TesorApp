import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error no controlado en la aplicación:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              {this.props.fallbackTitle || 'Ha ocurrido un error inesperado'}
            </h2>
            <p className="text-xs text-slate-600 font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 text-left overflow-auto max-h-28">
              {this.state.error?.message || 'Error de renderizado en la interfaz'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
