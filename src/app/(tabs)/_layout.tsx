import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function RootLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => <FontAwesome name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="youtube"
        options={{
          title: 'Youtube',
          tabBarIcon: ({ size, color }) => <FontAwesome name="youtube" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="google"
        options={{
          title: 'Google',
          tabBarIcon: ({ size, color }) => <FontAwesome name="google" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
