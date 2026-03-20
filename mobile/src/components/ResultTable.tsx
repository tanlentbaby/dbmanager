/**
 * 结果表格组件
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ResultTableProps {
  columns: string[];
  rows: any[][];
  maxRows?: number;
}

export default function ResultTable({
  columns,
  rows,
  maxRows = 100,
}: ResultTableProps) {
  const { colors } = useTheme();

  const displayRows = rows.slice(0, maxRows);
  const hasMore = rows.length > maxRows;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* 表头 */}
          <View style={[styles.row, styles.headerRow, { borderBottomColor: colors.border }]}>
            {columns.map((col, index) => (
              <Text
                key={index}
                style={[styles.cell, styles.headerCell, { color: colors.text, backgroundColor: colors.primary + '10' }]}
              >
                {col}
              </Text>
            ))}
          </View>

          {/* 数据行 */}
          {displayRows.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[
                styles.row,
                { borderBottomColor: colors.border },
                rowIndex % 2 === 0 ? { backgroundColor: colors.background } : {},
              ]}
            >
              {row.map((cell, cellIndex) => (
                <Text
                  key={cellIndex}
                  style={[styles.cell, { color: colors.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {cell !== null && cell !== undefined ? String(cell) : 'NULL'}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {hasMore && (
        <View style={styles.moreContainer}>
          <Text style={[styles.moreText, { color: colors.textMuted }]}>
            显示 {maxRows} / {rows.length} 行 (滚动查看更多)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    minWidth: '100%',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  headerRow: {
    position: 'sticky',
    top: 0,
  },
  cell: {
    flex: 1,
    padding: 12,
    fontSize: 13,
    minWidth: 100,
  },
  headerCell: {
    fontWeight: '600',
  },
  moreContainer: {
    padding: 12,
    alignItems: 'center',
  },
  moreText: {
    fontSize: 12,
  },
});
