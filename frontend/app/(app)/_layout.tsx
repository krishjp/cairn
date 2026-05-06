import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Redirect } from 'expo-router';

export default function AppLayout() {
  const { user, isLoading } = useAuth();

  // If the user is not authenticated, redirect to the landing page
  if (!isLoading && !user) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="ranking" />
    </Stack>
  );
}
