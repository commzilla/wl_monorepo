import React, { Component, ErrorInfo, ReactNode } from 'react';
import SimpleStatsFallback from './SimpleStatsFallback';

interface Props {
  children: ReactNode;
  selectedEnrollment?: any;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return <SimpleStatsFallback selectedEnrollment={this.props.selectedEnrollment} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
