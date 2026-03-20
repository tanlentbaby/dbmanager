/**
 * 书签页面
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

// 模拟数据
const MOCK_BOOKMARKS = [
  {
    id: '1',
    name: '查询所有用户',
    sql: 'SELECT * FROM users',
    description: '获取所有用户信息',
    tags: ['users', 'basic'],
  },
  {
    id: '2',
    name: '最近订单',
    sql: 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 10',
    description: '查看最近的 10 条订单',
    tags: ['orders', 'recent'],
  },
  {
    id: '3',
    name: '用户订单统计',
    sql: 'SELECT user_id, COUNT(*) as order_count FROM orders GROUP BY user_id',
    description: '统计每个用户的订单数',
    tags: ['orders', 'analytics'],
  },
];

export default function BookmarksScreen() {
  const { colors } = useTheme();

  const renderBookmark = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.bookmark, { backgroundColor: colors.card }]}>
      <View style={styles.bookmarkHeader}>
        <Text style={[styles.bookmarkName, { color: colors.text }]}>
          {item.name}
        </Text>
        <View style={styles.tags}>
          {item.tags.map((tag: string, index: number) => (
            <View
              key={index}
              style={[styles.tag, { backgroundColor: colors.primary + '20' }]}
            >
              <Text style={[styles.tagText, { color: colors.primary }]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[styles.bookmarkSql, { color: colors.textMuted }]}>
        {item.sql}
      </Text>
      {item.description && (
        <Text style={[styles.bookmarkDescription, { color: colors.textMuted }]}>
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={MOCK_BOOKMARKS}
        renderItem={renderBookmark}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  bookmark: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookmarkName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  tags: {
    flexDirection: 'row',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  bookmarkSql: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  bookmarkDescription: {
    fontSize: 13,
  },
});
