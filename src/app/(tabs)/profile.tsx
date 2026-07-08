import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Colors } from '../../constants/theme';
import { auth, logoutUser, isMock } from '../../config/firebase';
import { storageService, Activity } from '../../services/storageService';
import { Ionicons } from '@expo/vector-icons';
import { useDialogs } from '../../context/DialogContext';

export default function ProfileScreen() {
  const [weeklyGoal, setWeeklyGoal] = useState(20);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast, showConfirm } = useDialogs();

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
    showConfirm(
      'Keluar Akun',
      'Apakah Anda yakin ingin keluar dari aplikasi Lari Yuk?',
      async () => {
        try {
          await logoutUser();
          router.replace('/login');
          showToast('Sampai Jumpa', 'Anda telah berhasil keluar dari akun.', 'success');
        } catch {
          showToast('Error', 'Gagal melakukan logout.', 'error');
        }
      },
      'Keluar',
      'Batal',
      'danger'
    );
  };

  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    // Monday is index 0, Sunday is index 6
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const generateCalendarCells = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const cells = [];
    
    // Add empty padding days
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, key: `empty-${i}` });
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, key: `day-${day}` });
    }
    
    return cells;
  };

  const hasActivityOnDate = (day: number | null) => {
    if (!day) return false;
    const targetYear = currentDate.getFullYear();
    const targetMonth = currentDate.getMonth();
    
    return activities.some(a => {
      const actDate = new Date(a.createdAt);
      return (
        actDate.getFullYear() === targetYear &&
        actDate.getMonth() === targetMonth &&
        actDate.getDate() === day
      );
    });
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getWeeklyProgressDistance = (activitiesData: Activity[]) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const thisWeekActivities = activitiesData.filter(a => {
      const actDate = new Date(a.createdAt);
      return actDate >= monday && actDate <= today;
    });
    
    return thisWeekActivities.reduce((sum, a) => sum + a.distance, 0);
  };

  const currentWeekDistance = getWeeklyProgressDistance(activities);
  const progressPercentage = weeklyGoal > 0 ? Math.min(100, (currentWeekDistance / weeklyGoal) * 100) : 0;

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

            {/* Target Progress Bar */}
            <View style={styles.progressBarWrapper}>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressLabel}>Kemajuan Minggu Ini</Text>
                <Text style={styles.progressValue}>
                  {currentWeekDistance.toFixed(2)} / {weeklyGoal} km ({progressPercentage.toFixed(0)}%)
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
              </View>
              {progressPercentage >= 100 && (
                <View style={styles.goalAchievedRow}>
                  <Ionicons name="sparkles" size={16} color="#FF9500" style={{ marginRight: 6 }} />
                  <Text style={styles.goalAchievedText}>Selamat! Target lari minggu ini tercapai!</Text>
                </View>
              )}
            </View>
          </View>

          {/* Kalender Aktivitas Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Kalender Aktivitas</Text>
            <Text style={styles.sectionSubtitle}>Menampilkan riwayat lari harian Anda bulan ini.</Text>
            
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.calendarNavBtn}>
                <Ionicons name="chevron-back" size={20} color={Colors.light.text} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.calendarNavBtn}>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {/* Weekdays */}
            <View style={styles.weekdaysRow}>
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                <Text key={d} style={styles.weekdayText}>{d}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {generateCalendarCells().map(cell => {
                const isActive = hasActivityOnDate(cell.day);
                const isToday = cell.day !== null && 
                  new Date().getDate() === cell.day && 
                  new Date().getMonth() === currentDate.getMonth() && 
                  new Date().getFullYear() === currentDate.getFullYear();

                return (
                  <View key={cell.key} style={styles.dayCell}>
                    {cell.day !== null ? (
                      <View style={[
                        styles.dayCircle,
                        isActive && styles.activeDayCircle,
                        isToday && !isActive && styles.todayDayCircle
                      ]}>
                        <Text style={[
                          styles.dayText,
                          isActive && styles.activeDayText,
                          isToday && !isActive && styles.todayDayText
                        ]}>
                          {cell.day}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.light.primary }]} />
                <Text style={styles.legendText}>Hari Aktif</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.light.primary }]} />
                <Text style={styles.legendText}>Hari Ini</Text>
              </View>
            </View>
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
  progressBarWrapper: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: '#F0F0F3',
    paddingTop: 16,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.light.textSecondary,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E2E7',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: Colors.light.primary,
  },
  goalAchievedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#FFF9EB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEFC7',
  },
  goalAchievedText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: 'bold',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  calendarNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#F0F0F3',
    paddingBottom: 6,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8E8E93',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDayCircle: {
    backgroundColor: Colors.light.primary,
  },
  todayDayCircle: {
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  activeDayText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  todayDayText: {
    color: Colors.light.primary,
    fontWeight: 'bold',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontWeight: '600',
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
