/**
 * @file Discussion Error Boundary
 * Error boundary component for graceful error handling in discussions.
 *
 * @module DiscussionErrorBoundary
 */

'use client';

import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Error boundary for discussion components.
 * Catches JavaScript errors in child components and displays a fallback UI.
 */
class DiscussionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'Discussion Error Boundary caught an error:',
        error,
        errorInfo
      );
    }

    this.setState({
      error,
      errorInfo,
    });

    // You could also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Optionally trigger a refresh callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 h-5 w-5 flex-shrink-0 text-red-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-400">
                {this.props.title || 'Something went wrong'}
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                {this.props.message ||
                  'An error occurred while loading this section. Please try again.'}
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs">
                  <summary className="cursor-pointer font-medium text-red-300">
                    Error details (dev only)
                  </summary>
                  <pre className="mt-2 overflow-auto text-red-200">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              <button
                type="button"
                onClick={this.handleReset}
                className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DiscussionErrorBoundary;
