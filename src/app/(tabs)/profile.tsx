import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Colors } from '../../constants/theme';
import { auth, logoutUser, isMock } from '../../config/firebase';
import { storageService, Activity } from '../../services/storageService';
import { Ionicons } from '@expo/vector-icons';

interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export default function ProfileScreen() {
  const [weeklyGoal, setWeeklyGoal] = useState(20);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfileData = async () => {
    try {
      const activitiesData = await storageService.getActivities();
      const goal = await storageService.getWeeklyGoal();
      setActivities(activitiesData);
      setWeeklyGoal(goal);
    } catch (error) {
      console.error("Failed to load profile data", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const handleGoalChange = async (amount: number) => {
    const nextGoal = Math.max(5, weeklyGoal + amount);
    setWeeklyGoal(nextGoal);
    await storageService.setWeeklyGoal(nextGoal);
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar Akun',
      'Apakah Anda yakin ingin keluar dari aplikasi Lari Yuk?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Keluar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutUser();
              router.replace('/login');
            } catch {
              Alert.alert('Error', 'Gagal melakukan logout.');
            }
          }
        }
      ]
    );
  };

  // Determine Badge unlocks
  const getBadges = (): Badge[] => {
    const hasRuns = activities.length > 0;
    const has5K = activities.some(a => a.distance >= 5);
    const has10K = activities.some(a => a.distance >= 10);
    const hasEarlyBird = activities.some(a => {
      const hr = new Date(a.createdAt).getHours();
      return hr >= 4 && hr < 7; // morning between 4:00 and 6:59
    });
    const hasExplorer = activities.length >= 5;

    return [
      {
        id: 'first_run',
        title: 'Lari Pertama',
        description: 'Selesaikan aktivitas olahraga pertama Anda',
        icon: 'trophy',
        unlocked: hasRuns
      },
      {
        id: 'five_k',
        title: 'Finisher 5K',
        description: 'Selesaikan lari dengan jarak minimal 5 km',
        icon: 'ribbon',
        unlocked: has5K
      },
      {
        id: 'ten_k',
        title: 'Finisher 10K',
        description: 'Selesaikan lari dengan jarak minimal 10 km',
        icon: 'medal',
        unlocked: has10K
      },
      {
        id: 'early_bird',
        title: 'Burung Pagi',
        description: 'Mulai aktivitas lari sebelum jam 7 pagi',
        icon: 'sunny',
        unlocked: hasEarlyBird
      },
      {
        id: 'explorer',
        title: 'Penjelajah',
        description: 'Mencatat 5 kali atau lebih aktivitas olahraga',
        icon: 'compass',
        unlocked: hasExplorer
      }
    ];
  };

  const badges = getBadges();
  const unlockedCount = badges.filter(b => b.unlocked).length;

  const displayName = auth.currentUser?.displayName || 'Pelari';
  const displayEmail = auth.currentUser?.email || 'anonymous@lariyuk.com';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil & Pengaturan</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* User Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{displayEmail}</Text>
              
              {/* Database sync type badge */}
              <View style={[styles.dbBadge, isMock ? styles.mockBadge : styles.firebaseBadge]}>
                <Ionicons 
                  name={isMock ? "phone-portrait-outline" : "cloud-done-outline"} 
                  size={12} 
                  color="#FFF" 
                />
                <Text style={styles.dbBadgeText}>
                  {isMock ? 'Mode Demo (Lokal)' : 'Firebase Aktif'}
                </Text>
              </View>
            </View>
          </View>

          {/* Goal Configurator Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Target Mingguan Anda</Text>
            <Text style={styles.sectionSubtitle}>Sesuaikan jarak target lari Anda per minggu.</Text>
            
            <View style={styles.goalControlRow}>
              <TouchableOpacity 
                style={styles.goalBtn} 
                onPress={() => handleGoalChange(-5)}
                disabled={weeklyGoal <= 5}
              >
                <Ionicons name="remove" size={24} color={weeklyGoal <= 5 ? '#CCCCCC' : Colors.light.text} />
              </TouchableOpacity>
              
              <View style={styles.goalDisplay}>
                <Text style={styles.goalVal}>{weeklyGoal}</Text>
                <Text style={styles.goalUnit}>km</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.goalBtn} 
                onPress={() => handleGoalChange(5)}
              >
                <Ionicons name="add" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Badges / Achievements Section */}
          <Text style={styles.blockTitle}>Pencapaian & Lencana ({unlockedCount}/{badges.length})</Text>
          <View style={styles.badgesWrapper}>
            {badges.map(badge => (
              <View 
                key={badge.id} 
                style={[
                  styles.badgeCard,
                  !badge.unlocked && styles.lockedBadgeCard
                ]}
              >
                <View style={[
                  styles.badgeIconBg,
                  badge.unlocked ? styles.unlockedIconBg : styles.lockedIconBg
                ]}>
                  <Ionicons 
                    name={badge.icon as any} 
                    size={24} 
                    color={badge.unlocked ? '#FF9500' : '#8E8E93'} 
                  />
                </View>
                <View style={styles.badgeInfo}>
                  <Text style={[
                    styles.badgeTitle,
                    !badge.unlocked && styles.lockedText
                  ]}>
                    {badge.title}
                  </Text>
                  <Text style={styles.badgeDesc}>{badge.description}</Text>
                </View>
                {badge.unlocked ? (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />
                ) : (
                  <Ionicons name="lock-closed" size={18} color="#C7C7CC" />
                )}
              </View>
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity 
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.light.danger} style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Keluar Akun</Text>
          </TouchableOpacity>
          
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    padding: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  dbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  mockBadge: {
    backgroundColor: '#8E8E93',
  },
  firebaseBadge: {
    backgroundColor: Colors.light.primary,
  },
  dbBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  goalControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E2E7',
  },
  goalDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginHorizontal: 32,
  },
  goalVal: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  goalUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginLeft: 4,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  badgesWrapper: {
    marginBottom: 20,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  lockedBadgeCard: {
    opacity: 0.7,
  },
  badgeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedIconBg: {
    backgroundColor: '#FFEFC7',
  },
  lockedIconBg: {
    backgroundColor: '#F0F0F3',
  },
  badgeInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  lockedText: {
    color: Colors.light.textSecondary,
  },
  badgeDesc: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEFEB',
    borderRadius: 12,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.light.danger + '20',
  },
  logoutText: {
    color: Colors.light.danger,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
