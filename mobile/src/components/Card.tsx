/**
 * 卡片组件
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export default function Card({ children, onPress, padding = 'medium' }: CardProps) {
  const { colors } = useTheme();

  const getPaddingStyle = () => {
    switch (padding) {
      case 'none':
        return styles.paddingNone;
      case 'small':
        return styles.paddingSmall;
      case 'medium':
        return styles.paddingMedium;
      case 'large':
        return styles.paddingLarge;
      default:
        return styles.paddingMedium;
    }
  };

  const Component = onPress ? require('react-native').TouchableOpacity : View;

  return (
    <Component
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        getPaddingStyle(),
      ]}
    >
      {children}
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paddingNone: {
    padding: 0,
  },
  paddingSmall: {
    padding: 12,
  },
  paddingMedium: {
    padding: 16,
  },
  paddingLarge: {
    padding: 24,
  },
});
