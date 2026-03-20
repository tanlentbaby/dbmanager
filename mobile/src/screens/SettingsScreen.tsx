/**
 * 设置页面
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();

  const themeOptions = [
    { id: 'light', label: '浅色', icon: '☀️' },
    { id: 'dark', label: '深色', icon: '🌙' },
    { id: 'auto', label: '自动', icon: '⚙️' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>主题</Text>
        <View style={[styles.options, { backgroundColor: colors.card }]}>
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.option,
                mode === option.id && { backgroundColor: colors.primary + '20' },
              ]}
              onPress={() => setMode(option.id as any)}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {option.label}
              </Text>
              {mode === option.id && (
                <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>关于</Text>
        <View style={[styles.info, { backgroundColor: colors.card }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>版本</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>0.9.0</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder, { borderColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>构建</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>POC</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>平台</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>React Native</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          DBManager Mobile v0.9.0 POC
        </Text>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          React Native 移动端探索
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  options: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
