import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-8 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 bg-red-50 text-[#B91C1C] border border-red-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle size={28} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-[#111827]">Something went wrong</h1>
              <p className="text-xs text-[#64748B] leading-relaxed">
                An unexpected error occurred while loading this page. Please try refreshing or return to the home page.
              </p>
              {this.state.error?.message && (
                <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl text-[11px] text-[#B91C1C] font-mono text-left overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white font-bold text-xs hover:opacity-95 shadow-md shadow-orange-500/15 cursor-pointer transition-all"
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#111827] font-semibold text-xs hover:bg-[#FFF7ED] hover:border-[#FFEDD5] cursor-pointer transition-all"
              >
                <Home size={14} />
                <span>Go to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
