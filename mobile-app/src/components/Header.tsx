import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useAuth, UserRole } from '../context/AuthContext';
import { subscribeUnreadCount, getGlobalUnreadCount } from '../services/notificationService';

export const Header: React.FC<{ 
  title?: string; 
  subtitle?: string;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onPressBrand?: () => void;
  unreadCount?: number;
}> = ({ title, subtitle, onOpenNotifications, onOpenProfile, onPressBrand, unreadCount: propUnreadCount }) => {
  const { user, activeRole, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState<number>(propUnreadCount ?? getGlobalUnreadCount());
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

        {/* Action Controls: Authenticated Role Badge + Notification + Profile */}
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

          {/* Profile Button with Dropdown Trigger */}
          <TouchableOpacity
            style={[styles.profileBtn, showProfileMenu && styles.profileBtnActive]}
            onPress={() => setShowProfileMenu(prev => !prev)}
            activeOpacity={0.7}
            accessibilityLabel="Open profile and account menu"
            accessibilityRole="button"
          >
            <Ionicons 
              name="person" 
              size={15} 
              color={showProfileMenu ? COLORS.white : COLORS.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile & Account Dropdown Menu */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownBackdrop} 
          activeOpacity={1} 
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={[styles.dropdownCard, { top: insets.top + 52 }]}>
            {/* User Mini Info Header */}
            <View style={styles.dropdownHeader}>
              <View style={styles.dropdownAvatar}>
                <Text style={styles.dropdownAvatarText}>
                  {user?.avatarLetter || user?.name?.charAt(0)?.toUpperCase() || 'O'}
                </Text>
              </View>
              <View style={styles.dropdownUserInfo}>
                <Text style={styles.dropdownUserName} numberOfLines={1}>
                  {user?.name || (activeRole === 'GYM_OWNER' ? 'Gym Owner' : 'User')}
                </Text>
                <Text style={styles.dropdownUserRole} numberOfLines={1}>
                  {user?.email || getRoleLabel(activeRole)}
                </Text>
              </View>
            </View>

            <View style={styles.dropdownDivider} />

            {/* Menu Item 1: My Profile */}
            <TouchableOpacity
              style={styles.dropdownItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowProfileMenu(false);
                if (onOpenProfile) {
                  onOpenProfile();
                }
              }}
            >
              <View style={[styles.dropdownItemIconWrap, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="person-outline" size={16} color={COLORS.primary} />
              </View>
              <View style={styles.dropdownItemTextWrap}>
                <Text style={styles.dropdownItemTitle}>My Profile</Text>
                <Text style={styles.dropdownItemSub}>View and edit profile details</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            {/* Menu Item 2: Logout with Confirmation */}
            <TouchableOpacity
              style={styles.dropdownItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowProfileMenu(false);
                handleLogoutPress();
              }}
            >
              <View style={[styles.dropdownItemIconWrap, { backgroundColor: '#FFF1F2' }]}>
                <Ionicons name="log-out-outline" size={16} color={COLORS.rose} />
              </View>
              <View style={styles.dropdownItemTextWrap}>
                <Text style={[styles.dropdownItemTitle, { color: COLORS.rose }]}>Logout</Text>
                <Text style={styles.dropdownItemSub}>Sign out with confirmation</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  profileBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  dropdownCard: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) + 52 : 56,
    right: 16,
    width: 230,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dropdownAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownAvatarText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
  dropdownUserInfo: {
    flex: 1,
  },
  dropdownUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  dropdownUserRole: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 8,
  },
  dropdownItemIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemTextWrap: {
    flex: 1,
  },
  dropdownItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  dropdownItemSub: {
    fontSize: 9.5,
    color: COLORS.textMuted,
  },
});
