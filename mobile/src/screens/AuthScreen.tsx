/**
 * 登录屏幕
 * v1.0.0 Phase 1 - 认证系统
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button, Toast, LoadingOverlay } from '../components';
import { useAuth } from '../services/auth';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const { colors } = useTheme();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setToast({ message: '请填写所有字段', type: 'error' });
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setToast({ message: '请填写姓名', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
        setToast({ message: '登录成功', type: 'success' });
      } else {
        await register({ email, password, name });
        setToast({ message: '注册成功', type: 'success' });
      }
    } catch (err: any) {
      setToast({ message: err.message || '操作失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>DBManager</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {mode === 'login' ? '欢迎回来' : '创建账户'}
          </Text>
        </View>

        <View style={styles.form}>
          {mode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>姓名</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="请输入姓名"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>邮箱</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>密码</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <Button
            title={mode === 'login' ? '登录' : '注册'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            <Text style={[styles.switchText, { color: colors.textMuted }]}>
              {mode === 'login' ? '没有账户？去注册' : '已有账户？去登录'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            继续即表示同意服务条款和隐私政策
          </Text>
        </View>
      </ScrollView>

      <LoadingOverlay visible={loading} message={mode === 'login' ? '登录中...' : '注册中...'} />
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  submitButton: {
    marginTop: 8,
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
