import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const NOTIF_PREFS_KEY = '@gymora_notification_preferences';

export interface NotificationPreferences {
  workouts: boolean;
  diet: boolean;
  bookings: boolean;
  messages: boolean;
  store: boolean;
  announcements: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  workouts: true,
  diet: true,
  bookings: true,
  messages: true,
  store: true,
  announcements: true,
};

export const CustomerSettingsScreen: React.FC<{
  onNavigateTab?: (tab: string, sub?: string) => void;
}> = ({ onNavigateTab }) => {
  const { user, logout } = useAuth();

  // ---------------- Password Change State ----------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // ---------------- Notification Preferences State ----------------
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSavedBadge, setPrefsSavedBadge] = useState(false);

  // ---------------- Legal / Terms Modal State ----------------
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [selectedLegalSection, setSelectedLegalSection] = useState<'terms' | 'privacy' | 'gymRules' | 'refund'>('terms');

  // Load saved notification preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setNotifPrefs({ ...DEFAULT_PREFS, ...parsed });
        } else if ((user as any)?.notificationPreferences) {
          setNotifPrefs({ ...DEFAULT_PREFS, ...(user as any).notificationPreferences });
        }
      } catch (err) {
        console.warn('[CustomerSettings] Failed to load preferences:', err);
      }
    };
    loadPreferences();
  }, [user]);

  // Handle toggle change for notification preferences
  const handleTogglePreference = async (key: keyof NotificationPreferences) => {
    const updated = {
      ...notifPrefs,
      [key]: !notifPrefs[key],
    };
    setNotifPrefs(updated);
    setPrefsSaving(true);

    try {
      // 1. Immediately persist to local device storage
      await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(updated));

      // 2. Immediately persist to backend user account
      const userId = user?.id || user?._id;
      if (userId) {
        await api.put(`/users/${userId}`, { notificationPreferences: updated }).catch(() => {
          return api.patch(`/users/${userId}`, { notificationPreferences: updated });
        });
      }

      setPrefsSavedBadge(true);
      setTimeout(() => setPrefsSavedBadge(false), 2000);
    } catch (err) {
      console.warn('[CustomerSettings] Failed to save preference update:', err);
    } finally {
      setPrefsSaving(false);
    }
  };

  // Handle password change submission
  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword.trim()) {
      setPasswordError('Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await api.post('/auth/change-password', {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });

      if (res.data?.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess('Your password has been changed successfully!');
        Alert.alert('Success', 'Your password has been changed successfully.');
      } else {
        setPasswordError(res.data?.message || 'Failed to change password. Please check your current password.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to change password. Please check your current password.';
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleOpenLegal = (section: 'terms' | 'privacy' | 'gymRules' | 'refund') => {
    setSelectedLegalSection(section);
    setTermsModalVisible(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Account Summary Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Customer'}</Text>
        <Text style={styles.emailText}>{user?.email || 'customer@gymora.com'}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.rolePill}>
            <View style={styles.dot} />
            <Text style={styles.rolePillText}>Customer Account</Text>
          </View>
          <View style={styles.gymPill}>
            <Ionicons name="fitness-outline" size={12} color={COLORS.primaryDark} />
            <Text style={styles.gymPillText}>{user?.gymName || 'Perfect Fitness Studio'}</Text>
          </View>
        </View>
      </View>

      {/* 2. Password & Account Security */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
        <Text style={styles.sectionHeader}>Password & Security</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardSub}>
          Change your account password to keep your Gymora profile secure.
        </Text>

        {passwordError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{passwordError}</Text>
          </View>
        )}

        {passwordSuccess && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={styles.successText}>{passwordSuccess}</Text>
          </View>
        )}

        {/* Current Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              secureTextEntry={!showCurrentPassword}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>New Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Min 6 characters"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowNewPassword(!showNewPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, passwordLoading && styles.btnDisabled]}
          onPress={handlePasswordChange}
          disabled={passwordLoading}
          activeOpacity={0.8}
        >
          {passwordLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="key-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Update Password</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 3. Per-Category Notification Toggles */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="notifications" size={16} color={COLORS.primary} />
        <Text style={styles.sectionHeader}>Notification Preferences</Text>
        {prefsSavedBadge && (
          <View style={styles.savedPill}>
            <Ionicons name="checkmark" size={11} color="#16A34A" />
            <Text style={styles.savedPillText}>Saved</Text>
          </View>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardSub}>
          Customize alert channels. Changes take effect immediately.
        </Text>

        {/* Workouts */}
        <View style={styles.toggleRow}>
          <View style={[styles.toggleIconSquircle, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="barbell-outline" size={18} color="#EA580C" />
          </View>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Workout & Exercise</Text>
            <Text style={styles.toggleDesc}>
              Workout schedules, exercise approvals & coach routines
            </Text>
          </View>
          <Switch
            value={notifPrefs.workouts}
            onValueChange={() => handleTogglePreference('workouts')}
            trackColor={{ false: '#E2E8F0', true: '#EA580C' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Diet */}
        <View style={styles.toggleRow}>
          <View style={[styles.toggleIconSquircle, { backgroundColor: '#F0F9FF' }]}>
            <Ionicons name="nutrition-outline" size={18} color="#0284C7" />
          </View>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Diet & Nutrition</Text>
            <Text style={styles.toggleDesc}>
              Custom meal plan approvals, macros & daily nutrition tips
            </Text>
          </View>
          <Switch
            value={notifPrefs.diet}
            onValueChange={() => handleTogglePreference('diet')}
            trackColor={{ false: '#E2E8F0', true: '#EA580C' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Bookings */}
        <View style={styles.toggleRow}>
          <View style={[styles.toggleIconSquircle, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="calendar-outline" size={18} color="#10B981" />
          </View>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Bookings & Sessions</Text>
            <Text style={styles.toggleDesc}>
              Personal training bookings, approvals & reminders
            </Text>
          </View>
          <Switch
            value={notifPrefs.bookings}
            onValueChange={() => handleTogglePreference('bookings')}
            trackColor={{ false: '#E2E8F0', true: '#EA580C' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Messages */}
        <View style={styles.toggleRow}>
          <View style={[styles.toggleIconSquircle, { backgroundColor: '#F5F3FF' }]}>
            <Ionicons name="chatbubbles-outline" size={18} color="#8B5CF6" />
          </View>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Trainer Messages</Text>
            <Text style={styles.toggleDesc}>
              Direct chat messages & voice notes from your coach
            </Text>
          </View>
          <Switch
            value={notifPrefs.messages}
            onValueChange={() => handleTogglePreference('messages')}
            trackColor={{ false: '#E2E8F0', true: '#EA580C' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Store & Orders */}
        <View style={styles.toggleRow}>
          <View style={[styles.toggleIconSquircle, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="cart-outline" size={18} color="#F59E0B" />
          </View>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Store Orders</Text>
            <Text style={styles.toggleDesc}>
              Product purchases, dispatch updates & delivery statuses
            </Text>
          </View>
          <Switch
            value={notifPrefs.store}
            onValueChange={() => handleTogglePreference('store')}
            trackColor={{ false: '#E2E8F0', true: '#EA580C' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Announcements */}
        <View style={[styles.toggleRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <View style={[styles.toggleIconSquircle, { backgroundColor: '#FDF2F8' }]}>
            <Ionicons name="megaphone-outline" size={18} color="#EC4899" />
          </View>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Announcements & Perks</Text>
            <Text style={styles.toggleDesc}>
              Membership renewals, gym events & exclusive offers
            </Text>
          </View>
          <Switch
            value={notifPrefs.announcements}
            onValueChange={() => handleTogglePreference('announcements')}
            trackColor={{ false: '#E2E8F0', true: '#EA580C' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 4. Terms and Conditions & Legal Access */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
        <Text style={styles.sectionHeader}>Legal & Policies</Text>
      </View>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.legalRow}
          onPress={() => handleOpenLegal('terms')}
          activeOpacity={0.7}
        >
          <View style={styles.legalRowLeft}>
            <Ionicons name="document-text-outline" size={18} color="#EA580C" />
            <View>
              <Text style={styles.legalRowTitle}>Terms of Service</Text>
              <Text style={styles.legalRowSub}>Platform usage guidelines & member agreements</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.legalRow}
          onPress={() => handleOpenLegal('privacy')}
          activeOpacity={0.7}
        >
          <View style={styles.legalRowLeft}>
            <Ionicons name="lock-closed-outline" size={18} color="#0284C7" />
            <View>
              <Text style={styles.legalRowTitle}>Privacy Policy</Text>
              <Text style={styles.legalRowSub}>How we handle and secure your personal data</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.legalRow}
          onPress={() => handleOpenLegal('gymRules')}
          activeOpacity={0.7}
        >
          <View style={styles.legalRowLeft}>
            <Ionicons name="fitness-outline" size={18} color="#10B981" />
            <View>
              <Text style={styles.legalRowTitle}>Gym Code of Conduct</Text>
              <Text style={styles.legalRowSub}>Facility safety, cleanliness & equipment usage</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.legalRow, { borderBottomWidth: 0, paddingBottom: 0 }]}
          onPress={() => handleOpenLegal('refund')}
          activeOpacity={0.7}
        >
          <View style={styles.legalRowLeft}>
            <Ionicons name="receipt-outline" size={18} color="#8B5CF6" />
            <View>
              <Text style={styles.legalRowTitle}>Cancellation & Refund Policy</Text>
              <Text style={styles.legalRowSub}>Session cancellation windows and refund terms</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* 5. App Info & Logout */}
      <View style={styles.appInfoCard}>
        <Text style={styles.appInfoText}>Gymora Customer Mobile App · Version 2.4.0</Text>
        <Text style={styles.appInfoSub}>All systems operational · Secure cloud sync</Text>
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          Alert.alert('Sign Out', 'Are you sure you want to log out of your account?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ]);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={18} color={COLORS.rose} />
        <Text style={styles.logoutBtnText}>Sign Out from Account</Text>
      </TouchableOpacity>

      {/* 6. Terms & Conditions Modal Viewer */}
      <Modal
        visible={termsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="document-text" size={20} color="#EA580C" />
              <Text style={styles.modalHeaderTitle}>Terms & Policies</Text>
            </View>
            <TouchableOpacity
              onPress={() => setTermsModalVisible(false)}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.modalTabsRow}>
            <TouchableOpacity
              style={[styles.modalTab, selectedLegalSection === 'terms' && styles.modalTabActive]}
              onPress={() => setSelectedLegalSection('terms')}
            >
              <Text style={[styles.modalTabText, selectedLegalSection === 'terms' && styles.modalTabTextActive]}>
                Terms
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalTab, selectedLegalSection === 'privacy' && styles.modalTabActive]}
              onPress={() => setSelectedLegalSection('privacy')}
            >
              <Text style={[styles.modalTabText, selectedLegalSection === 'privacy' && styles.modalTabTextActive]}>
                Privacy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalTab, selectedLegalSection === 'gymRules' && styles.modalTabActive]}
              onPress={() => setSelectedLegalSection('gymRules')}
            >
              <Text style={[styles.modalTabText, selectedLegalSection === 'gymRules' && styles.modalTabTextActive]}>
                Gym Rules
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalTab, selectedLegalSection === 'refund' && styles.modalTabActive]}
              onPress={() => setSelectedLegalSection('refund')}
            >
              <Text style={[styles.modalTabText, selectedLegalSection === 'refund' && styles.modalTabTextActive]}>
                Refunds
              </Text>
            </TouchableOpacity>
          </View>

          {/* Modal Content Body */}
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            {selectedLegalSection === 'terms' && (
              <View style={styles.legalSectionWrap}>
                <Text style={styles.legalTitle}>Gymora Terms of Service</Text>
                <Text style={styles.legalSub}>Last updated: October 2026</Text>

                <Text style={styles.legalP}>
                  Welcome to Gymora. By accessing or using our mobile application and member services, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, please discontinue using the application.
                </Text>

                <Text style={styles.legalHeading}>1. Account Security & Verification</Text>
                <Text style={styles.legalP}>
                  You are responsible for safeguarding your login credentials. You agree to immediately notify Gymora and gym administration of any unauthorized access to your account. You may not share your account or member QR code with other individuals.
                </Text>

                <Text style={styles.legalHeading}>2. Training & Health Advisory</Text>
                <Text style={styles.legalP}>
                  Physical exercise involves inherent risk of injury. Before beginning any workout routine or meal plan provided by Gymora or assigned coaches, consult a medical healthcare professional. You voluntarily assume all risks associated with participation in workout activities.
                </Text>

                <Text style={styles.legalHeading}>3. Personal Training Sessions</Text>
                <Text style={styles.legalP}>
                  Personal training sessions must be scheduled in advance through the Gymora mobile app. Cancellations must be made at least 4 hours before the booked time slot. Late cancellations or no-shows are subject to full forfeiture of the session credit.
                </Text>

                <Text style={styles.legalHeading}>4. Membership & Billing</Text>
                <Text style={styles.legalP}>
                  Membership passes grant gym access according to the purchased tier. Payments are processed securely via verified gateways. Memberships are non-transferable and subject to gym operating schedules and branch rules.
                </Text>
              </View>
            )}

            {selectedLegalSection === 'privacy' && (
              <View style={styles.legalSectionWrap}>
                <Text style={styles.legalTitle}>Privacy & Data Protection Policy</Text>
                <Text style={styles.legalSub}>Last updated: October 2026</Text>

                <Text style={styles.legalP}>
                  Gymora takes member privacy seriously. We collect and process essential fitness data to provide workout tracking, coach reviews, attendance verification, and personalized recommendations.
                </Text>

                <Text style={styles.legalHeading}>1. Information We Collect</Text>
                <Text style={styles.legalP}>
                  • Profile Information: Name, email address, mobile number, emergency contact, age, and profile photo.{'\n'}
                  • Fitness Data: Height, weight, workouts logged, diet logs, and trainer communication notes.{'\n'}
                  • App Usage: Device push tokens, notification settings, and security authentication logs.
                </Text>

                <Text style={styles.legalHeading}>2. Data Usage & Confidentiality</Text>
                <Text style={styles.legalP}>
                  Your data is used solely to provide gym services, facilitate trainer coaching, and enhance your fitness experience. We never sell or rent your personal information to third-party marketers or advertisers.
                </Text>

                <Text style={styles.legalHeading}>3. Data Security</Text>
                <Text style={styles.legalP}>
                  All passwords and credentials are cryptographically hashed using industry-standard bcrypt. Data in transit is protected by TLS encryption.
                </Text>
              </View>
            )}

            {selectedLegalSection === 'gymRules' && (
              <View style={styles.legalSectionWrap}>
                <Text style={styles.legalTitle}>Gym Facility Code of Conduct</Text>
                <Text style={styles.legalSub}>Rules for a safe, respectful training environment</Text>

                <Text style={styles.legalHeading}>1. Equipment Etiquette</Text>
                <Text style={styles.legalP}>
                  • Always re-rack weights and dumbbells after completing your sets.{'\n'}
                  • Wipe down machines, benches, and cardio equipment with provided sanitized towels.{'\n'}
                  • Allow other members to work in during peak gym hours.
                </Text>

                <Text style={styles.legalHeading}>2. Proper Attire & Hygiene</Text>
                <Text style={styles.legalP}>
                  • Athletic workout shoes must be worn at all times. Open-toe footwear or sandals are strictly prohibited on the workout floor.{'\n'}
                  • Clean athletic clothing and workout towels are required for all members.
                </Text>

                <Text style={styles.legalHeading}>3. Check-in & Security</Text>
                <Text style={styles.legalP}>
                  Scan your member QR code or check in at the front desk upon entering. Respect gym staff, fellow athletes, and personal trainers.
                </Text>
              </View>
            )}

            {selectedLegalSection === 'refund' && (
              <View style={styles.legalSectionWrap}>
                <Text style={styles.legalTitle}>Cancellation & Refund Policy</Text>
                <Text style={styles.legalSub}>Membership passes, session bookings & store purchases</Text>

                <Text style={styles.legalHeading}>1. Membership Cancellations</Text>
                <Text style={styles.legalP}>
                  Membership cancellations must be submitted in writing or through the Gymora support desk. Unused portions of annual passes may be refunded on a pro-rata basis subject to administrative processing terms.
                </Text>

                <Text style={styles.legalHeading}>2. Personal Trainer Session Bookings</Text>
                <Text style={styles.legalP}>
                  Sessions cancelled at least 4 hours prior to the scheduled start time will be credited back to your account without fee. Cancellations made with less than 4 hours notice will be charged as completed.
                </Text>

                <Text style={styles.legalHeading}>3. Supplement & Store Orders</Text>
                <Text style={styles.legalP}>
                  Unopened, sealed store items in original packaging can be returned or exchanged within 7 days of delivery or pick-up.
                </Text>
              </View>
            )}

            <View style={{ marginTop: 24, paddingBottom: 32 }}>
              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setTermsModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalDoneBtnText}>I Understand & Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 14, paddingBottom: 110 },

  // Profile Card
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  emailText: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
  rolePillText: { fontSize: 10, fontWeight: '700', color: '#047857' },
  gymPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  gymPillText: { fontSize: 10, fontWeight: '700', color: COLORS.primaryDark },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeader: { fontSize: 13, fontWeight: '800', color: COLORS.textDark, flex: 1 },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  savedPillText: { fontSize: 9, fontWeight: '800', color: '#16A34A' },

  // Card Containers
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  cardSub: { fontSize: 11, color: COLORS.textMuted, marginBottom: 12, lineHeight: 16 },

  // Password Input Form
  inputGroup: { marginBottom: 10 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 12,
    color: COLORS.textDark,
  },
  eyeBtn: { padding: 4 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: { fontSize: 11, color: '#DC2626', fontWeight: '600', flex: 1 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  successText: { fontSize: 11, color: '#16A34A', fontWeight: '600', flex: 1 },

  // Toggles Row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  toggleIconSquircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
  toggleDesc: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  // Legal Rows
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  legalRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  legalRowTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
  legalRowSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  // App Info & Logout
  appInfoCard: {
    alignItems: 'center',
    marginVertical: 10,
    gap: 2,
  },
  appInfoText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  appInfoSub: { fontSize: 9, color: '#94A3B8' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  logoutBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.rose },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  modalCloseBtn: { padding: 4 },
  modalTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 6,
  },
  modalTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modalTabActive: {
    borderBottomColor: '#EA580C',
  },
  modalTabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  modalTabTextActive: { color: '#EA580C', fontWeight: '800' },
  modalContent: { flex: 1 },
  modalScrollContent: { padding: 18 },
  legalSectionWrap: { gap: 12 },
  legalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  legalSub: { fontSize: 11, color: '#64748B', marginBottom: 6 },
  legalHeading: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginTop: 10 },
  legalP: { fontSize: 12, color: '#475569', lineHeight: 18 },
  modalDoneBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
