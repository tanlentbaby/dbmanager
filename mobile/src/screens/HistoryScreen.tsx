/**
 * 历史记录屏幕 (增强版)
 * v0.9.0 Phase 2 - 添加筛选和清除功能
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Card, Toast } from '../components';

// 模拟数据
const MOCK_HISTORY = [
  {
    id: '1',
    sql: 'SELECT * FROM users WHERE id = 1',
    executedAt: new Date().toISOString(),
    duration: 45,
    status: 'success',
  },
  {
    id: '2',
    sql: 'SELECT COUNT(*) FROM orders',
    executedAt: new Date(Date.now() - 60000).toISOString(),
    duration: 23,
    status: 'success',
  },
  {
    id: '3',
    sql: 'UPDATE users SET name = "test"',
    executedAt: new Date(Date.now() - 120000).toISOString(),
    duration: 0,
    status: 'error',
  },
];

type FilterType = 'all' | 'success' | 'error';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<FilterType>('all');
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const filteredHistory = filter === 'all' ? history : history.filter((h) => h.status === filter);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleClear = () => {
    Alert.alert('清除历史', '确定要清除所有历史记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: () => {
          setHistory([]);
          setToast({ message: '历史记录已清除', type: 'success' });
        },
      },
    ]);
  };

  const renderHistory = ({ item }: { item: any }) => (
    <Card padding="medium">
      <View style={styles.historyHeader}>
        <View style={styles.headerLeft}>
          <Text style={[styles.historyTime, { color: colors.textMuted }]}>{formatTime(item.executedAt)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.status === 'success' ? colors.success + '20' : colors.error + '20' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: item.status === 'success' ? colors.success : colors.error },
              ]}
            >
              {item.status === 'success' ? '✅' : '❌'}
            </Text>
          </View>
        </View>
        <Text style={[styles.historyDuration, { color: colors.textMuted }]}>{item.duration}ms</Text>
      </View>
      <Text style={[styles.historySql, { color: colors.text }]}>{item.sql}</Text>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 筛选器 */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.card },
            filter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'all' ? '#ffffff' : colors.text },
            ]}
          >
            全部
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.card },
            filter === 'success' && { backgroundColor: colors.success, borderColor: colors.success },
          ]}
          onPress={() => setFilter('success')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'success' ? '#ffffff' : colors.text },
            ]}
          >
            成功
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.card },
            filter === 'error' && { backgroundColor: colors.error, borderColor: colors.error },
          ]}
          onPress={() => setFilter('error')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'error' ? '#ffffff' : colors.text },
            ]}
          >
            失败
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.clearButton, { backgroundColor: colors.card }]} onPress={handleClear}>
          <Text style={[styles.clearText, { color: colors.error }]}>🗑️ 清除</Text>
        </TouchableOpacity>
      </View>

      {/* 历史记录列表 */}
      <FlatList
        data={filteredHistory}
        renderItem={renderHistory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>暂无历史记录</Text>
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTime: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
  },
  historyDuration: {
    fontSize: 12,
  },
  historySql: {
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 20,
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
