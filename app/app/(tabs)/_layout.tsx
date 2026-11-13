import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { BottomBar, type BottomBarItem } from '../../src/components/BottomBar';
import { colors } from '../../src/theme';

const TABS: { name: string; label: string; accessibilityLabel?: string; icon: BottomBarItem['icon'] }[] = [
  { name: 'home', label: 'Latihan', icon: 'mic-outline' },
  { name: 'companion', label: 'Pendamping', accessibilityLabel: 'Mode Pendamping', icon: 'people-outline' },
  { name: 'settings', label: 'Pengaturan', icon: 'settings-outline' },
];

// Practice sessions live in the root Stack, so they cover this navigator and hide the bar.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      tabBar={({ state, navigateToTab, insets }) => (
        <View style={{ backgroundColor: colors.background, paddingBottom: insets.bottom }}>
          <BottomBar
            items={TABS.map((t) => ({
              key: t.name,
              label: t.label,
              accessibilityLabel: t.accessibilityLabel,
              icon: t.icon,
              active: state.routes[state.index]?.name === t.name,
              onPress: () => {
                const route = state.routes.find((r) => r.name === t.name);
                if (route) navigateToTab(route.key);
              },
            }))}
          />
        </View>
      )}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} />
      ))}
    </Tabs>
  );
}
