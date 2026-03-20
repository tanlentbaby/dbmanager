/**
 * 主页
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const menuItems = [
    {
      id: 'query',
      title: '执行查询',
      icon: '📝',
      description: '编写和执行 SQL 查询',
      screen: 'Query',
    },
    {
      id: 'ai',
      title: 'AI 助手',
      icon: '🤖',
      description: '自然语言转 SQL/解释/优化',
      screen: 'AI',
    },
    {
      id: 'bookmarks',
      title: '书签',
      icon: '🔖',
      description: '管理常用查询',
      screen: 'Bookmarks',
    },
    {
      id: 'history',
      title: '历史记录',
      icon: '📜',
      description: '查看查询历史',
      screen: 'History',
    },
    {
      id: 'connect',
      title: '连接数据库',
      icon: '🔌',
      description: '添加数据库连接',
      screen: 'DatabaseConnect',
    },
    {
      id: 'plugins',
      title: '插件',
      icon: '🔌',
      description: '插件市场和管理',
      screen: 'Plugins',
    },
    {
      id: 'settings',
      title: '设置',
      icon: '⚙️',
      description: '应用配置',
      screen: 'Settings',
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>DBManager</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          移动端 v0.9.0
        </Text>
      </View>

      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate(item.screen as any)}
          >
            <View style={styles.menuIcon}>
              <Text style={styles.menuIconText}>{item.icon}</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.menuDescription, { color: colors.textMuted }]}>
                {item.description}
              </Text>
            </View>
            <Text style={[styles.menuArrow, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.footer, { backgroundColor: colors.card }]}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          DBManager Mobile v0.9.0 POC
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  menu: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#58a6ff20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuIconText: {
    fontSize: 24,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 24,
    fontWeight: '300',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
