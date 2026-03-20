/**
 * 历史记录页面
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

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

export default function HistoryScreen() {
  const { colors } = useTheme();

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderHistory = ({ item }: { item: any }) => (
    <View style={[styles.history, { backgroundColor: colors.card }]}>
      <View style={styles.historyHeader}>
        <Text style={[styles.historyTime, { color: colors.textMuted }]}>
          {formatTime(item.executedAt)}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'success' ? colors.success + '20' : colors.error + '20' },
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.status === 'success' ? colors.success : colors.error },
          ]}>
            {item.status === 'success' ? '✅' : '❌'}
          </Text>
        </View>
      </View>
      <Text style={[styles.historySql, { color: colors.text }]}>
        {item.sql}
      </Text>
      <Text style={[styles.historyDuration, { color: colors.textMuted }]}>
        耗时：{item.duration}ms
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={MOCK_HISTORY}
        renderItem={renderHistory}
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
  history: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  historySql: {
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  historyDuration: {
    fontSize: 12,
  },
});
