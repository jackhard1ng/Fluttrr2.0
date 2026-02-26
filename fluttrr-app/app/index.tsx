import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

export default function Index() {
  const { isAuthenticated, accountType, isAdmin } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (isAdmin) {
    return <Redirect href="/(admin)/(dashboard)" />;
  }

  if (accountType === 'business') {
    return <Redirect href="/(business)/(dashboard)" />;
  }

  return <Redirect href="/(user)/(home)" />;
}
