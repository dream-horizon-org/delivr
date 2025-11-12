import React from 'react';

import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import { NewAppScreen } from '@react-native/new-app-screen';
import {StatusBar, StyleSheet, useColorScheme, View} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { withCodePush } from './codepush/withCodePush';
import { getCodePushConfig } from './codepush/config';

const queryClient = new QueryClient();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <QueryClientProvider client={queryClient}>
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <NewAppScreen
        templateFileName="App.tsx"
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const env = 'staging';

export default withCodePush(getCodePushConfig(env))(App);

