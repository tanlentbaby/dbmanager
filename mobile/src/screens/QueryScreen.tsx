/**
 * 查询执行页面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

export default function QueryScreen() {
  const { colors } = useTheme();
  const [sql, setSql] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async () => {
    if (!sql.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.executeQuery(sql);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (loading) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            执行查询中...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.errorIcon]}>❌</Text>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      );
    }

    if (result) {
      return (
        <View style={[styles.resultContainer, { backgroundColor: colors.card }]}>
          <View style={styles.resultHeader}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              查询结果
            </Text>
            <Text style={[styles.resultCount, { color: colors.textMuted }]}>
              {result.rows?.length || 0} 行
            </Text>
          </View>

          {result.columns && (
            <ScrollView horizontal>
              <View style={styles.table}>
                {/* 表头 */}
                <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: colors.border }]}>
                  {result.columns.map((col: string, index: number) => (
                    <Text
                      key={index}
                      style={[styles.tableCellHeader, { color: colors.text }]}
                    >
                      {col}
                    </Text>
                  ))}
                </View>

                {/* 数据行 */}
                {result.rows?.map((row: any[], rowIndex: number) => (
                  <View
                    key={rowIndex}
                    style={[
                      styles.tableRow,
                      { borderBottomColor: colors.border },
                      rowIndex % 2 === 0 ? { backgroundColor: colors.background } : {},
                    ]}
                  >
                    {row.map((cell: any, cellIndex: number) => (
                      <Text
                        key={cellIndex}
                        style={[styles.tableCell, { color: colors.text }]}
                      >
                        {cell !== null ? String(cell) : 'NULL'}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      );
    }

    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          输入 SQL 查询并执行
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="SELECT * FROM ..."
          placeholderTextColor={colors.textMuted}
          multiline
          value={sql}
          onChangeText={setSql}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.executeButton, { backgroundColor: colors.primary }]}
          onPress={executeQuery}
          disabled={loading || !sql.trim()}
        >
          <Text style={styles.executeButtonText}>执行</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultScroll}>
        {renderResult()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  buttonRow: {
    marginTop: 16,
  },
  resultScroll: {
    flex: 1,
  },
  resultContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 13,
  },
  emptyContainer: {
    margin: 16,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
er: {
    padding: 20,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
  },
  resultContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 13,
  },
  table: {
    minWidth: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableHeader: {
    backgroundColor: '#58a6ff10',
  },
  tableCellHeader: {
    flex: 1,
    padding: 12,
    fontWeight: '600',
    fontSize: 13,
  },
  tableCell: {
    flex: 1,
    padding: 12,
    fontSize: 13,
  },
  emptyContainer: {
    margin: 16,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
