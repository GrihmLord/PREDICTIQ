// src/components/ErrorBoundary.tsx
// Catches render-time failures so one bad component cannot leave the operator
// staring at a blank window with no way forward.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {colors} from '../styles/colors';

interface Props {
  children: React.ReactNode;
  /** Shown in the heading so the operator knows which panel failed. */
  label?: string;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {error: null, componentStack: null};

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {error};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Kept for the on-screen detail panel; there is no telemetry sink to send
    // this to, and inventing one would be an undisclosed network call.
    this.setState({componentStack: info.componentStack || null});
    console.error('[ErrorBoundary] render failed', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({error: null, componentStack: null});
  };

  render() {
    const {error, componentStack} = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>
          {this.props.label || 'This panel'} stopped responding
        </Text>
        <Text style={styles.message}>
          {error.message || 'An unexpected error occurred.'}
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={this.handleRetry}
          accessibilityRole="button">
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>

        {componentStack && (
          <ScrollView style={styles.stackBox}>
            <Text style={styles.stackText}>{componentStack.trim()}</Text>
          </ScrollView>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.dark.background,
  },
  icon: {fontSize: 40, marginBottom: 12},
  title: {
    color: colors.dark.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 520,
  },
  button: {
    backgroundColor: colors.primary.main,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {color: '#FFF', fontWeight: '700'},
  stackBox: {
    marginTop: 24,
    maxHeight: 180,
    width: '100%',
    maxWidth: 620,
    backgroundColor: colors.dark.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
  },
  stackText: {
    color: colors.dark.textMuted,
    fontFamily: 'monospace',
    fontSize: 11,
  },
});

export default ErrorBoundary;
