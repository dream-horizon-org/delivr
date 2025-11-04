import React from 'react';
import axios from 'axios';
import {QueryClient, QueryClientProvider, useQuery} from '@tanstack/react-query';

import { NewAppScreen } from '@react-native/new-app-screen';
import {Platform, StatusBar, StyleSheet, useColorScheme, View, NativeModules} from 'react-native';
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
        <UpdateCheckOnMount />
    </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <NewAppScreen
        templateFileName="AppNew.tsx"
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}

function UpdateCheckOnMount() {
  React.useEffect(() => {
    NativeModules.CodePush.getConfiguration().then((cfg: any) => {
      console.log('CodePush cfg', cfg);
    }).catch((e: any) => {
      console.log('CodePush cfg read failed', e?.message);
    });
  }, []);
  useQuery({
    queryKey: ['update_check'],
    queryFn: async () => {
      const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      const url = `http://${host}:1080/v0.1/public/codepush/update_check?deployment_key=deployment-key-1&app_version=1.0.0`;
      const response = await axios.get(url);
      console.log('Update check response:', response.data);
      return response.data;
    },
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
  });

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const env = 'staging';

export default withCodePush(getCodePushConfig(env))(App);



