import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Activity, storageService } from '../../services/storageService';
import { auth } from '../../config/firebase';
import ActivityCard from '../../components/ActivityCard';
import WeeklyChart from '../../components/WeeklyChart';
import { Ionicons } from '@expo/vector-icons';



export default function HomeScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<{ day: string; distance: number }[]>([]);

  // Aggregate general statistics
  const totalDistance = activities.reduce((sum, act) => sum + act.distance, 0);
  const totalDuration = activities.reduce((sum, act) => sum + act.duration, 0);
  const totalActivities = activities.length;
  const totalCalories = activities.reduce((sum, act) => sum + act.calories, 0);

  // Formatter for Hours sum (e.g. 15:32:45)
  const formatTotalTime = (totalSecs: number): string => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const loadData = async () => {
    try {
      let data = await storageService.getActivities();
      
      // Sync offline activities in background
      storageService.syncUnsyncedActivities().catch(err => console.log("Sync error:", err));

      setActivities(data);
      
      // Calculate weekly chart data
      const weeklyDistances = storageService.getWeeklyPerformance(data);
      setWeeklyData(weeklyDistances);

    } catch (error) {
      console.error("Failed to load activities in Home", error);
    } finally {
      setLoading(false);
    }
  };

  // Reload data every time tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const displayName = auth.currentUser?.displayName || 'Pelari';

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Image 
          source={require('../../../assets/images/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitial}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Welcome section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeLabel}>Halo,</Text>
            <Text style={styles.welcomeName}>{displayName} 👋</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalDistance.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Total Jarak (km)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatTotalTime(totalDuration)}</Text>
              <Text style={styles.statLabel}>Total Waktu</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalActivities}</Text>
              <Text style={styles.statLabel}>Aktivitas (kali)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalCalories.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Kalori (kkal)</Text>
            </View>
          </View>

          {/* Last Activity Card */}
          {activities.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Aktivitas Terakhir</Text>
                <TouchableOpacity onPress={() => router.push('/activities')}>
                  <Text style={styles.sectionLink}>Lihat Semua</Text>
                </TouchableOpacity>
              </View>
              <ActivityCard 
                activity={activities[0]} 
                onPress={() => router.push(`/activity/${activities[0].id}`)} 
              />
            </View>
          )}

          {/* Weekly Performance Chart */}
          <View style={styles.sectionContainer}>
            <WeeklyChart data={weeklyData} />
          </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  logo: {
    width: 120,
    height: 38,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
  },
  profileButton: {
    marginLeft: 4,
  },
  profilePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 6,
  },
  sectionContainer: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  sectionLink: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '600',
  },
});
