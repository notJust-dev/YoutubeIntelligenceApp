import { Tabs } from 'expo-router';

export default function RootLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Youtube' }} />
      <Tabs.Screen name="google" options={{ title: 'Google' }} />
    </Tabs>
  );
}
