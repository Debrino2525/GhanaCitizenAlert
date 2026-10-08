import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Keyboard } from 'react-native';
import { Video, AlertTriangle, Radio, Clock } from 'lucide-react-native';
import { TabType } from '../types';
import { tokens } from '../theme/tokens';

interface TabBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pendingCount?: number;
}

export const TabBar: React.FC<TabBarProps> = memo(({ activeTab, onSelectTab, pendingCount = 0 }) => {
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
          size={16}
        />
        <Text style={[styles.tabText, activeTab === 'CAPTURE' && styles.tabTextActive]}>
          Capture
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
          size={16}
        />
        <Text style={[styles.tabText, activeTab === 'ALERTS' && styles.tabTextActive]}>
          Amber
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
          size={16}
        />
        <Text style={[styles.tabText, activeTab === 'SOS' && styles.tabTextActive]}>
          SOS
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          Keyboard.dismiss();
          onSelectTab('QUEUE');
        }}
        style={[styles.tabItem, activeTab === 'QUEUE' && styles.tabItemActiveQueue]}
        accessibilityRole="tab"
        accessibilityLabel="Pending Uploads Queue"
      >
        <View style={{ position: 'relative' }}>
          <Clock
            color={activeTab === 'QUEUE' ? tokens.colors.text.white : tokens.colors.text.secondary}
            size={16}
          />
          {pendingCount > 0 && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabText, activeTab === 'QUEUE' && styles.tabTextActive]}>
          Queue
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    gap: 6,
    backgroundColor: tokens.colors.bg.subtle,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.subtle
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
  tabItemActiveQueue: {
    backgroundColor: tokens.colors.brand.gold,
    borderColor: tokens.colors.brand.gold
  },
  tabText: {
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '700',
    color: tokens.colors.text.secondary
  },
  tabTextActive: {
    color: tokens.colors.text.white
  },
  badgeDot: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: tokens.colors.status.danger,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold'
  }
});
