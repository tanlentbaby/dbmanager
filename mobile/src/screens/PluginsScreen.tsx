/**
 * 插件屏幕
 * v0.9.0 Phase 4 - 插件系统
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Card, Button, Toast, LoadingOverlay } from '../components';
import { pluginService, Plugin } from '../services/plugins';

type TabType = 'installed' | 'market';

export default function PluginsScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabType>('market');
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadPlugins();
  }, [tab]);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const data = tab === 'installed'
        ? await pluginService.getInstalledPlugins()
        : await pluginService.getMarketPlugins();
      setPlugins(data);
    } catch (err: any) {
      setToast({ message: '加载失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (plugin: Plugin) => {
    setLoading(true);
    try {
      await pluginService.installPlugin(plugin.id);
      setToast({ message: `${plugin.name} 已安装`, type: 'success' });
      loadPlugins();
    } catch (err: any) {
      setToast({ message: '安装失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async (plugin: Plugin) => {
    setLoading(true);
    try {
      await pluginService.uninstallPlugin(plugin.id);
      setToast({ message: `${plugin.name} 已卸载`, type: 'success' });
      loadPlugins();
    } catch (err: any) {
      setToast({ message: '卸载失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredPlugins = searchQuery
    ? plugins.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : plugins;

  const renderPlugin = ({ item }: { item: Plugin }) => (
    <Card padding="medium">
      <View style={styles.pluginHeader}>
        <View style={styles.pluginInfo}>
          <Text style={styles.pluginIcon}>{item.icon || '🔌'}</Text>
          <View>
            <Text style={[styles.pluginName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.pluginVersion, { color: colors.textMuted }]}>
              v{item.version} • {item.category}
            </Text>
          </View>
        </View>
        {item.installed ? (
          <Button
            title="卸载"
            onPress={() => handleUninstall(item)}
            variant="outline"
            size="small"
          />
        ) : (
          <Button
            title="安装"
            onPress={() => handleInstall(item)}
            variant="primary"
            size="small"
          />
        )}
      </View>
      <Text style={[styles.pluginDescription, { color: colors.textMuted }]}>{item.description}</Text>
      <View style={styles.pluginMeta}>
        <Text style={[styles.pluginMetaText, { color: colors.textMuted }]}>
          ⭐ {item.rating} • ⬇️ {item.downloads}
        </Text>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 标签切换 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            { backgroundColor: colors.card },
            tab === 'installed' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setTab('installed')}
        >
          <Text
            style={[
              styles.tabText,
              { color: tab === 'installed' ? '#ffffff' : colors.text },
            ]}
          >
            已安装
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            { backgroundColor: colors.card },
            tab === 'market' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setTab('market')}
        >
          <Text
            style={[
              styles.tabText,
              { color: tab === 'market' ? '#ffffff' : colors.text },
            ]}
          >
            插件市场
          </Text>
        </TouchableOpacity>
      </View>

      {/* 搜索框 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="搜索插件..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* 插件列表 */}
      <FlatList
        data={filteredPlugins}
        renderItem={renderPlugin}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {searchQuery ? '没有找到插件' : tab === 'installed' ? '暂无已安装插件' : '暂无插件'}
            </Text>
          </View>
        }
      />

      <LoadingOverlay visible={loading} message="处理中..." />
      
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
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 0,
  },
  searchInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  pluginHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pluginInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pluginIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  pluginName: {
    fontSize: 16,
    fontWeight: '600',
  },
  pluginVersion: {
    fontSize: 12,
    marginTop: 2,
  },
  pluginDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  pluginMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  pluginMetaText: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
