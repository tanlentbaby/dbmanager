/**
 * 通用按钮组件
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
}: ButtonProps) {
  const { colors } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = [styles.button];

    // 变体
    if (variant === 'primary') {
      baseStyle.push({ backgroundColor: colors.primary });
    } else if (variant === 'secondary') {
      baseStyle.push({ backgroundColor: colors.secondary });
    } else if (variant === 'outline') {
      baseStyle.push({
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primary,
      });
    }

    // 尺寸
    if (size === 'small') {
      baseStyle.push(styles.buttonSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonLarge);
    }

    // 禁用状态
    if (disabled) {
      baseStyle.push({ opacity: 0.5 });
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText];

    if (variant === 'outline') {
      baseStyle.push({ color: colors.primary });
    } else {
      baseStyle.push({ color: '#ffffff' });
    }

    if (size === 'small') {
      baseStyle.push(styles.buttonTextSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonTextLarge);
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <>
          {icon && <Text style={styles.buttonIcon}>{icon}</Text>}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextSmall: {
    fontSize: 13,
  },
  buttonTextLarge: {
    fontSize: 17,
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
});
