/**
 * 数据库连接页面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

export default function DatabaseConnectScreen() {
  const { colors } = useTheme();
  const [config, setConfig] = useState({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: '',
  });

  const handleConnect = async () => {
    try {
      await api.connect(config);
      Alert.alert('成功', '数据库连接成功！');
    } catch (err: any) {
      Alert.alert('连接失败', err.message || '无法连接到数据库');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>主机</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={config.host}
          onChangeText={(text) => setConfig({ ...config, host: text })}
          placeholder="localhost"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.label, { color: colors.text }]}>端口</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={config.port}
          onChangeText={(text) => setConfig({ ...config, port: text })}
          placeholder="3306"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
        />

        <Text style={[styles.label, { color: colors.text }]}>用户名</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={config.user}
          onChangeText={(text) => setConfig({ ...config, user: text })}
          placeholder="root"
          placeholderTextColor={colors.textMuted}
        />

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
          value={config.password}
          onChangeText={(text) => setConfig({ ...config, password: text })}
          placeholder="••••••"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <Text style={[styles.label, { color: colors.text }]}>数据库</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={config.database}
          onChangeText={(text) => setConfig({ ...config, database: text })}
          placeholder="mydb"
          placeholderTextColor={colors.textMuted}
        />

        <TouchableOpacity
          style={[styles.connectButton, { backgroundColor: colors.primary }]}
          onPress={handleConnect}
        >
          <Text style={styles.connectButtonText}>连接数据库</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.tip, { backgroundColor: colors.card }]}>
        <Text style={[styles.tipTitle, { color: colors.text }]}>💡 提示</Text>
        <Text style={[styles.tipText, { color: colors.textMuted }]}>
          确保数据库服务正在运行，并且允许远程连接。
          首次使用建议先在桌面版配置好连接。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  connectButton: {
    marginTop: 32,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  tip: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
