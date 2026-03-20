/**
 * SQL 编辑器组件
 */

import React from 'react';
import { TextInput, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SQLEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  height?: number;
}

export default function SQLEditor({
  value,
  onChange,
  placeholder = 'SELECT * FROM ...',
  editable = true,
  height = 150,
}: SQLEditorProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { height }]}>
      <TextInput
        style={[
          styles.editor,
          {
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        editable={editable}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        keyboardType="default"
        textAlignVertical="top"
        selectTextOnFocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  editor: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
    padding: 12,
  },
});
