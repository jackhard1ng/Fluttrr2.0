import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function EventsStackLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.dark } }} />;
}
