/**
 * 应用导航
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import QueryScreen from '../screens/QueryScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DatabaseConnectScreen from '../screens/DatabaseConnectScreen';

export type RootStackParamList = {
  Home: undefined;
  Query: { databaseId?: string };
  Bookmarks: undefined;
  History: undefined;
  Settings: undefined;
  DatabaseConnect: undefined;
  AI: undefined;
  Plugins: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0d1117',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'DBManager' }}
      />
      <Stack.Screen 
        name="Query" 
        component={QueryScreen} 
        options={{ title: '执行查询' }}
      />
      <Stack.Screen 
        name="Bookmarks" 
        component={BookmarksScreen} 
        options={{ title: '书签' }}
      />
      <Stack.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ title: '历史记录' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: '设置' }}
      />
      <Stack.Screen 
        name="DatabaseConnect" 
        component={DatabaseConnectScreen} 
        options={{ title: '连接数据库' }}
      />
      <Stack.Screen 
        name="AI" 
        component={AIScreen} 
        options={{ title: 'AI 助手' }}
      />
      <Stack.Screen 
        name="Plugins" 
        component={PluginsScreen} 
        options={{ title: '插件市场' }}
      />
    </Stack.Navigator>
  );
}
: '插件市场' }}
      />
    </Stack.Navigator>
  );
}
