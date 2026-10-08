import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Keyboard } from 'react-native';
import { Video, AlertTriangle, Radio } from 'lucide-react-native';
import { TabType } from '../types';
import { tokens } from '../theme/tokens';

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
        style={[styles.tabItem, activeTab === 'CAPTURE' && styles.tabItemActiveCapture]}
        accessibilityRole="tab"
        accessibilityLabel="60s Evidence Capture"
      >
        <Video
          color={activeTab === 'CAPTURE' ? tokens.colors.text.white : tokens.colors.text.secondary}
          size={18}
        />
        <Text style={[styles.tabText, activeTab === 'CAPTURE' && styles.tabTextActive]}>
          60s Evidence
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          Keyboard.dismiss();
          onSelectTab('ALERTS');
        }}
        style={[styles.tabItem, activeTab === 'ALERTS' && styles.tabItemActiveAlerts]}
        accessibilityRole="tab"
        accessibilityLabel="Amber Alerts Hub"
      >
        <AlertTriangle
          color={activeTab === 'ALERTS' ? tokens.colors.text.white : tokens.colors.text.secondary}
          size={18}
        />
        <Text style={[styles.tabText, activeTab === 'ALERTS' && styles.tabTextActive]}>
          Amber Alerts
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          Keyboard.dismiss();
          onSelectTab('SOS');
        }}
        style={[styles.tabItem, activeTab === 'SOS' && styles.tabItemActiveSos]}
        accessibilityRole="tab"
        accessibilityLabel="Emergency SOS Panic Beacon"
      >
        <Radio
          color={activeTab === 'SOS' ? tokens.colors.text.white : tokens.colors.text.secondary}
          size={18}
        />
        <Text style={[styles.tabText, activeTab === 'SOS' && styles.tabTextActive]}>
          SOS Panic
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg.subtle,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.subtle
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surface.card,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  tabItemActiveCapture: {
    backgroundColor: tokens.colors.police.primary,
    borderColor: tokens.colors.police.accent
  },
  tabItemActiveAlerts: {
    backgroundColor: tokens.colors.status.amber,
    borderColor: tokens.colors.status.warning
  },
  tabItemActiveSos: {
    backgroundColor: tokens.colors.status.emergency,
    borderColor: tokens.colors.status.danger
  },
  tabText: {
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '700',
    color: tokens.colors.text.secondary
  },
  tabTextActive: {
    color: tokens.colors.text.white
  }
});
