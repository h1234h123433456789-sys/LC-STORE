import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleResetStorage = () => {
    try {
      localStorage.removeItem('lc_cart');
      localStorage.removeItem('lc_user_session');
      sessionStorage.removeItem('lc_admin_auth');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#08080A] text-white flex items-center justify-center p-4 font-sans text-right" dir="rtl">
          <div className="max-w-md w-full bg-[#121217] border border-[#D4AF37]/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-700/60 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">حدث خطأ غير متوقع</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                نعتذر عن هذا الخطأ المؤقت. يمكنك إعادة تحميل المتجر للمتابعة.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-black gold-gradient-bg rounded-lg hover:brightness-110 flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل المتجر</span>
              </button>

              <button
                onClick={this.handleResetStorage}
                className="py-2.5 px-4 text-xs font-semibold text-neutral-300 hover:text-white bg-[#1A1A22] border border-neutral-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
                title="تصفير الجلسة المؤقتة إذا علقت البيانات"
              >
                <Trash2 className="w-4 h-4 text-neutral-400" />
                <span>إصلاح البيانات</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
