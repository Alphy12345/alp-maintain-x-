import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import OverviewScreen from '../screens/OverviewScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';

const Tab = createBottomTabNavigator();

function BottomTabsBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.bottomTabs}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <Text style={[styles.tabText, isFocused && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <BottomTabsBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="Work Orders" component={PlaceholderScreen} initialParams={{ title: 'Work Orders' }} />
      <Tab.Screen name="Assets" component={PlaceholderScreen} initialParams={{ title: 'Assets' }} />
      <Tab.Screen name="Messages" component={PlaceholderScreen} initialParams={{ title: 'Messages' }} />
      <Tab.Screen name="More" component={PlaceholderScreen} initialParams={{ title: 'More' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bottomTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 18,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#2563eb',
  },
});
