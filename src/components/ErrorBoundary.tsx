import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  correlationId: string;
}

function logError(error: Error, errorInfo: ErrorInfo, correlationId: string) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "frontend",
      correlationId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      eventType: "unhandled_error",
    })
  );

  // Send to the log-error edge function. Fire-and-forget — we don't want a
  // failing log request to mask the original error.
  supabase.functions
    .invoke("log-error", {
      body: {
        source: "frontend:error-boundary",
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        user_agent: navigator.userAgent,
        metadata: {
          correlation_id: correlationId,
          component_stack: errorInfo.componentStack,
        },
      },
    })
    .catch(() => {});
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: crypto.randomUUID(),
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      correlationId: crypto.randomUUID(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logError(error, errorInfo, this.state.correlationId);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: crypto.randomUUID(),
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground">
                We've logged this error and our team will look into it.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-left">
              <p className="text-xs text-muted-foreground font-mono">
                Error ID: {this.state.correlationId.slice(0, 8)}
              </p>
              {this.state.error && (
                <p className="text-xs text-destructive mt-2 font-mono break-all">
                  {this.state.error.message}
                </p>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={this.handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleReload}>
                Reload Page
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
