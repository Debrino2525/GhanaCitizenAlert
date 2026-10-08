import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Keyboard } from 'react-native';
import { TabType } from '../types';

interface TabBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const TabBar: React.FC<TabBarProps> = memo(({ activeTab, onSelectTab }) => {
  return (
    <View style={styles.tabBar}>
      <TouchableOpacity
        onPress={() => {
          Keyboard.dismiss();
          onSelectTab('CAPTURE');
        }}
        style={[styles.tabItem, activeTab === 'CAPTURE' && styles.tabItemActive]}
      >
        <Text style={[styles.tabText, activeTab === 'CAPTURE' && styles.tabTextActive]}>
          📹 60s Evidence
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          Keyboard.dismiss();
          onSelectTab('ALERTS');
        }}
        style={[styles.tabItem, activeTab === 'ALERTS' && styles.tabItemActiveAmber]}
      >
        <Text style={[styles.tabText, activeTab === 'ALERTS' && styles.tabTextActive]}>
          ⚠️ Amber Alerts
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          Keyboard.dismiss();
          onSelectTab('SOS');
        }}
        style={[styles.tabItem, activeTab === 'SOS' && styles.tabItemActiveRed]}
      >
        <Text style={[styles.tabText, activeTab === 'SOS' && styles.tabTextActive]}>
          🚨 SOS Panic
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  tabItemActive: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6'
  },
  tabItemActiveAmber: {
    backgroundColor: '#D97706',
    borderColor: '#F59E0B'
  },
  tabItemActiveRed: {
    backgroundColor: '#DC2626',
    borderColor: '#EF4444'
  },
  tabText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8'
  },
  tabTextActive: {
    color: '#ffffff'
  }
});
