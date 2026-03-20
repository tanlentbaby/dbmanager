/**
 * 书签屏幕 (增强版)
 * v0.9.0 Phase 2 - 添加搜索和删除功能
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Card, Toast } from '../components';
import { bookmarkService, Bookmark } from '../services';

// 模拟数据 (实际应该从 API 获取)
const MOCK_BOOKMARKS: Bookmark[] = [
  {
    id: '1',
    name: '查询所有用户',
    sql: 'SELECT * FROM users',
    description: '获取所有用户信息',
    tags: ['users', 'basic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: '最近订单',
    sql: 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 10',
    description: '查看最近的 10 条订单',
    tags: ['orders', 'recent'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: '用户订单统计',
    sql: 'SELECT user_id, COUNT(*) as order_count FROM orders GROUP BY user_id',
    description: '统计每个用户的订单数',
    tags: ['orders', 'analytics'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function BookmarksScreen() {
  const { colors } = useTheme();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(MOCK_BOOKMARKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const filteredBookmarks = searchQuery
    ? bookmarks.filter(
        (b) =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.sql.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : bookmarks;

  const handleDelete = (id: string, name: string) => {
    Alert.alert('删除书签', `确定要删除"${name}"吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          setBookmarks(bookmarks.filter((b) => b.id !== id));
          setToast({ message: '书签已删除', type: 'success' });
        },
      },
    ]);
  };

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <Card padding="medium">
      <View style={styles.bookmarkHeader}>
        <Text style={[styles.bookmarkName, { color: colors.text }]}>{item.name}</Text>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
          <Text style={styles.deleteButton}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tags}>
        {item.tags.map((tag, index) => (
          <View key={index} style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.sqlContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.bookmarkSql, { color: colors.textMuted }]}>{item.sql}</Text>
      </View>
      {item.description && (
        <Text style={[styles.bookmarkDescription, { color: colors.textMuted }]}>{item.description}</Text>
      )}
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 搜索框 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="搜索书签..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 书签列表 */}
      <FlatList
        data={filteredBookmarks}
        renderItem={renderBookmark}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {searchQuery ? '没有找到匹配的书签' : '暂无书签'}
            </Text>
          </View>
        }
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  clearButton: {
    marginLeft: 12,
    fontSize: 18,
    color: '#8b949e',
  },
  list: {
    padding: 16,
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
  deleteButton: {
    fontSize: 20,
    padding: 4,
  },
  tags: {
    flexDirection: 'row',
    marginBottom: 8,
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
  sqlContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  bookmarkSql: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  bookmarkDescription: {
    fontSize: 13,
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
