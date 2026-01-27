import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabs from './MainTabs';
import AssetDetailScreen from '../screens/AssetDetailScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import WorkOrderDetailScreen from '../screens/WorkOrderDetailScreen';
import ProcedureStepsScreen from '../screens/ProcedureStepsScreen';

const Stack = createNativeStackNavigator();

export default function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="WorkOrderDetail" component={WorkOrderDetailScreen} />
      <Stack.Screen name="ProcedureSteps" component={ProcedureStepsScreen} />
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
    </Stack.Navigator>
  );
}
