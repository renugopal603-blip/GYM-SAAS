import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth, UserRole } from '../context/AuthContext';
import { subscribeUnreadCount, getGlobalUnreadCount } from '../services/notificationService';

export const Header: React.FC<{ 
  title?: string; 
  subtitle?: string;
  onOpenNotifications?: () => void;
  onPressBrand?: () => void;
  unreadCount?: number;
}> = ({ title, subtitle, onOpenNotifications, onPressBrand, unreadCount: propUnreadCount }) => {
  const { user, activeRole, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(propUnreadCount ?? getGlobalUnreadCount());

  useEffect(() => {
    if (propUnreadCount !== undefined) {
      setUnreadCount(propUnreadCount);
      return;
    }
    const unsubscribe = subscribeUnreadCount((count) => {
      setUnreadCount(count);
    });
    return unsubscribe;
  }, [propUnreadCount]);

  const getRoleLabel = (role: UserRole | null) => {
    switch (role) {
      case 'GYM_OWNER': return 'Gym Owner';
      case 'TRAINER': return 'Trainer';
      case 'CUSTOMER': return 'Customer';
      default: return 'User';
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Sign Out',
      `Are you sure you want to log out of your ${getRoleLabel(activeRole)} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: () => logout() 
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Brand & Subtitle (Tapping Gymora navigates to the main page) */}
        <TouchableOpacity 
          style={styles.brandRow}
          onPress={onPressBrand}
          activeOpacity={onPressBrand ? 0.7 : 1}
          accessibilityLabel="Go to main page"
          accessibilityRole="button"
        >
          <View style={styles.logoBadge}>
            <Ionicons name="fitness" size={18} color={COLORS.white} />
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandName}>Gymora</Text>
            <Text style={styles.brandSub} numberOfLines={1}>
              {subtitle || user?.gymName || user?.name || 'Mobile Platform'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action Controls: Authenticated Role Badge + Notification + Logout */}
        <View style={styles.controlsRow}>

          {/* Authenticated Role Badge */}
          <View 
            style={styles.roleBadge}
            accessibilityLabel={`Signed in as ${getRoleLabel(activeRole)}`}
          >
            <View style={styles.activeDot} />
            <Text style={styles.roleBadgeText}>{getRoleLabel(activeRole)}</Text>
          </View>

          {/* Header Notifications Shortcut */}
          {onOpenNotifications && (
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={onOpenNotifications}
              activeOpacity={0.7}
              accessibilityLabel={`View notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <Ionicons name="notifications-outline" size={16} color={COLORS.textDark} />
              {unreadCount > 0 && (
                unreadCount > 1 ? (
                  <View style={styles.notifCountBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.notifDot} />
                )
              )}
            </TouchableOpacity>
          )}

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogoutPress}
            activeOpacity={0.7}
            accessibilityLabel="Sign out of your account"
          >
            <Ionicons name="log-out-outline" size={16} color={COLORS.rose} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexShrink: 1,
    marginRight: 10,
  },
  brandTextWrap: {
    flex: 1,
    flexShrink: 1,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
    lineHeight: 18,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
    lineHeight: 13,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  roleBadge: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.roseLight,
    borderWidth: 1,
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.rose,
  },
  notifCountBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: COLORS.rose,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  notifBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 10,
  },
});
