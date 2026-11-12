import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Keyboard } from 'react-native';
import { Camera, Bell, Asterisk, History } from 'lucide-react-native';
import { TabType } from '../types';
import { tokens } from '../theme/tokens';

interface TabBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pendingCount?: number;
  isSosActive?: boolean;
  bottomInset?: number;
}

/**
 * Bottom navigation: Report · Alerts · SOS (centre, red pill) · My Reports.
 */
export const TabBar: React.FC<TabBarProps> = memo(({
  activeTab,
  onSelectTab,
  pendingCount = 0,
  isSosActive = false,
  bottomInset = 0
}) => {
  const select = (tab: TabType) => {
    Keyboard.dismiss();
    onSelectTab(tab);
  };

  const tabColor = (tab: TabType) =>
    activeTab === tab ? tokens.colors.brand.gold : tokens.colors.text.secondary;

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(bottomInset, tokens.spacing.sm) }]}>
      <TouchableOpacity
        onPress={() => select('CAPTURE')}
        style={styles.tabItem}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'CAPTURE' }}
        accessibilityLabel="Report an incident"
      >
        <Camera color={tabColor('CAPTURE')} size={22} />
        <Text style={[styles.tabText, { color: tabColor('CAPTURE') }]}>Report</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => select('ALERTS')}
        style={styles.tabItem}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'ALERTS' }}
        accessibilityLabel="Safety alerts"
      >
        <Bell color={tabColor('ALERTS')} size={22} />
        <Text style={[styles.tabText, { color: tabColor('ALERTS') }]}>Alerts</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => select('SOS')}
        style={styles.tabItem}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'SOS' }}
        accessibilityLabel={isSosActive ? 'Emergency SOS, active' : 'Emergency SOS'}
      >
        <View
          style={[
            styles.sosPill,
            activeTab === 'SOS' && styles.sosPillSelected,
            isSosActive && styles.sosPillLive
          ]}
        >
          <Asterisk color={tokens.colors.text.white} size={16} strokeWidth={3} />
          <Text style={styles.sosText}>SOS</Text>
          {isSosActive && <View style={styles.sosLiveDot} />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => select('QUEUE')}
        style={styles.tabItem}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'QUEUE' }}
        accessibilityLabel={pendingCount > 0 ? `My reports, ${pendingCount} waiting to send` : 'My reports'}
      >
        <View>
          <History color={tabColor('QUEUE')} size={22} />
          {pendingCount > 0 && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabText, { color: tabColor('QUEUE') }]}>My Reports</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg.subtle,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.subtle
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: tokens.touchTarget.minHeight
  },
  tabText: {
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.sansMedium
  },
  sosPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.sos.container
  },
  sosPillSelected: {
    borderWidth: 2,
    borderColor: tokens.colors.sos.onContainer
  },
  sosPillLive: {
    backgroundColor: tokens.colors.status.danger
  },
  sosText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.monoBold
  },
  sosLiveDot: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.colors.text.white
  },
  badgeDot: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: tokens.colors.sos.container,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  badgeText: {
    color: tokens.colors.text.white,
    fontSize: 10,
    fontFamily: tokens.typography.fontFamily.monoBold
  }
});
