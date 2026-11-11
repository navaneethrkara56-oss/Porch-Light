import React from 'react';
import { Button } from '@/components/ui/Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled app error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-porcelain flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-deep-purple/10 flex items-center justify-center mb-4">
            <span className="w-3 h-3 rounded-full bg-electric-lemon animate-ping" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple mb-3">
            Something interrupted the light.
          </h1>
          <p className="font-mono text-xs text-dark-gray/60 max-w-md mb-8">
            An unexpected error occurred. You can return home or reset the application state.
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/';
              }}
            >
              Return Home
            </Button>
            <Button
              variant="dark"
              size="sm"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >
              Reset Cache & Reload
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
