/**
 * AI 助手屏幕
 * v0.9.0 Phase 3 - AI 深度增强
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button, SQLEditor, Card, LoadingOverlay, Toast } from '../components';
import { aiService } from '../services';

type AIMode = 'nl2sql' | 'explain' | 'optimize';

export default function AIScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<AIMode>('nl2sql');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleAI = async () => {
    if (!input.trim()) {
      setToast({ message: '请输入内容', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      let result;
      if (mode === 'nl2sql') {
        result = await aiService.nl2sql(input);
        setOutput({ sql: result.sql, explanation: result.explanation });
      } else if (mode === 'explain') {
        result = await aiService.explain(input);
        setOutput(result);
      } else if (mode === 'optimize') {
        result = await aiService.optimize(input);
        setOutput(result);
      }
      setToast({ message: 'AI 处理完成', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'AI 处理失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const modes: { id: AIMode; label: string; icon: string; placeholder: string }[] = [
    { id: 'nl2sql', label: '自然语言转 SQL', icon: '💬', placeholder: '例如：查询最近 7 天订单最多的用户' },
    { id: 'explain', label: '解释 SQL', icon: '📖', placeholder: '粘贴 SQL 语句进行解释' },
    { id: 'optimize', label: '优化 SQL', icon: '⚡', placeholder: '粘贴 SQL 语句进行优化' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 模式选择 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll}>
        {modes.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[
              styles.modeButton,
              { backgroundColor: colors.card },
              mode === m.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 2 },
            ]}
            onPress={() => {
              setMode(m.id);
              setOutput(null);
            }}
          >
            <Text style={styles.modeIcon}>{m.icon}</Text>
            <Text style={[styles.modeLabel, { color: colors.text }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 输入区域 */}
      <View style={styles.inputSection}>
        <SQLEditor
          value={input}
          onChange={setInput}
          placeholder={modes.find((m) => m.id === mode)?.placeholder || ''}
          height={120}
        />
        <Button title="执行 AI" onPress={handleAI} loading={loading} icon="🤖" style={styles.aiButton} />
      </View>

      {/* 输出区域 */}
      {output && (
        <ScrollView style={styles.outputSection}>
          <Card padding="medium">
            <Text style={[styles.outputTitle, { color: colors.text }]}>
              {mode === 'nl2sql' ? '生成的 SQL' : mode === 'explain' ? 'SQL 解释' : '优化结果'}
            </Text>

            {mode === 'nl2sql' && (
              <>
                <View style={[styles.sqlBlock, { backgroundColor: colors.background }]}>
                  <Text style={[styles.sqlText, { color: colors.text }]}>{output.sql}</Text>
                </View>
                {output.explanation && (
                  <Text style={[styles.explanation, { color: colors.textMuted }]}>{output.explanation}</Text>
                )}
              </>
            )}

            {mode === 'explain' && (
              <>
                <Text style={[styles.explainSummary, { color: colors.text }]}>{output.summary}</Text>
                {output.breakdown?.map((item: string, i: number) => (
                  <Text key={i} style={[styles.explainItem, { color: colors.textMuted }]}>• {item}</Text>
                ))}
                {output.suggestions?.map((item: string, i: number) => (
                  <Text key={i} style={[styles.explainSuggestion, { color: colors.warning }]}>💡 {item}</Text>
                ))}
              </>
            )}

            {mode === 'optimize' && (
              <>
                <View style={[styles.sqlBlock, { backgroundColor: colors.background }]}>
                  <Text style={[styles.sqlText, { color: colors.text }]}>{output.optimized}</Text>
                </View>
                {output.suggestions?.map((item: string, i: number) => (
                  <Text key={i} style={[styles.explainSuggestion, { color: colors.warning }]}>💡 {item}</Text>
                ))}
              </>
            )}
          </Card>
        </ScrollView>
      )}

      {!output && !loading && (
        <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            选择 AI 模式并输入内容
          </Text>
        </View>
      )}

      <LoadingOverlay visible={loading} message="AI 处理中..." />
      
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
  modeScroll: {
    maxHeight: 80,
    padding: 16,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputSection: {
    padding: 16,
    paddingTop: 0,
  },
  aiButton: {
    marginTop: 16,
  },
  outputSection: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  outputTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sqlBlock: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  sqlText: {
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  explanation: {
    fontSize: 13,
    lineHeight: 20,
  },
  explainSummary: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 22,
  },
  explainItem: {
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 8,
    marginBottom: 4,
  },
  explainSuggestion: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
