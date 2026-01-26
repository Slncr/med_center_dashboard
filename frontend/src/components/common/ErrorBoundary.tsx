import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Здесь можно отправить ошибку в сервис мониторинга
    // sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>😔 Что-то пошло не так</h2>
            <p>Произошла непредвиденная ошибка в приложении.</p>
            <details className="error-details">
              <summary>Детали ошибки</summary>
              <pre>{this.state.error?.toString()}</pre>
            </details>
            <button onClick={this.handleRetry} className="retry-button">
              Попробовать снова
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="reload-button"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;