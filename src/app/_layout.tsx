import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { migrateDbIfNeeded } from '@/db/migrations';
import { Colors } from '@/constants/theme';

export const DATABASE_NAME = 'expenses.db';

// Keep the native splash screen up until the database is open and migrated,
// instead of flashing a blank screen. Must be called at module scope.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

/** Rendered as the provider's first child, which only mounts once the DB is ready. */
function HideSplashWhenReady() {
  useEffect(() => {
    SplashScreen.hide();
  }, []);
  return null;
}

/** Never leave the user stuck on the splash screen if the DB fails to open. */
function handleDatabaseError(error: Error): never {
  SplashScreen.hide();
  throw error;
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const navigationTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={navigationTheme}>
      {/* Opens the DB and runs migrations before any screen renders. */}
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        onInit={migrateDbIfNeeded}
        onError={handleDatabaseError}>
        <HideSplashWhenReady />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="index" options={{ title: 'Expenses' }} />
          <Stack.Screen name="expense/new" options={{ title: 'Add expense' }} />
          <Stack.Screen name="expense/[id]" options={{ title: 'Edit expense' }} />
          <Stack.Screen name="summary" options={{ title: 'Summary' }} />
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
