/**
 * Global Error Boundary Component
 * Catches React errors and logs them to console
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Container, Paper, Title, Text, Button, Stack } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('🚨 ErrorBoundary caught an error:');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container size="md" py="xl">
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack gap="md">
              <div className="flex items-center gap-3">
                <IconAlertCircle size={32} className="text-red-500" />
                <Title order={2} className="text-red-600">
                  Something went wrong
                </Title>
              </div>

              <Text size="sm" c="dimmed">
                An unexpected error occurred. Please check the console for details.
              </Text>

              {this.state.error && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <Text size="xs" fw={600} className="mb-2">
                    Error Message:
                  </Text>
                  <Text size="xs" className="font-mono text-red-600">
                    {this.state.error.message}
                  </Text>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="light"
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                >
                  Go Home
                </Button>
              </div>
            </Stack>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

