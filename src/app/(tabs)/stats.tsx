import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { Colors } from '../../constants/theme';
import { Activity, storageService } from '../../services/storageService';
import { formatPace } from '../../components/ActivityCard';
import { Ionicons } from '@expo/vector-icons';

type PeriodType = 'week' | 'month' | 'year';

export default function StatsScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');

  const loadData = async () => {
    try {
      const data = await storageService.getActivities();
      setActivities(data);
    } catch (error) {
      console.error("Failed to load activities in stats", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Filter activities based on period
  const getFilteredActivities = (): Activity[] => {
    const today = new Date();
    
    return activities.filter(act => {
      const actDate = new Date(act.createdAt);
      
      if (selectedPeriod === 'week') {
        const currentDay = today.getDay();
        const distToMon = currentDay === 0 ? 6 : currentDay - 1;
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - distToMon);
        startOfWeek.setHours(0, 0, 0, 0);
        return actDate >= startOfWeek;
      }
      
      if (selectedPeriod === 'month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return actDate >= startOfMonth;
      }
      
      // year
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return actDate >= startOfYear;
    });
  };

  const periodActivities = getFilteredActivities();

  // Metrics calculations
  const totalDistance = periodActivities.reduce((sum, a) => sum + a.distance, 0);
  const totalCalories = periodActivities.reduce((sum, a) => sum + a.calories, 0);
  const averagePace = periodActivities.length > 0
    ? Math.round(periodActivities.reduce((sum, a) => sum + a.pace, 0) / periodActivities.length)
    : 0;

  // Chart data setup
  const getChartPoints = (): number[] => {
    if (selectedPeriod === 'week') {
      // 7 days (Monday to Sunday)
      const pts = Array(7).fill(0);
      const today = new Date();
      const currentDay = today.getDay();
      const distToMon = currentDay === 0 ? 6 : currentDay - 1;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - distToMon);
      startOfWeek.setHours(0,0,0,0);

      periodActivities.forEach(act => {
        const date = new Date(act.createdAt);
        const dayNum = date.getDay();
        const index = dayNum === 0 ? 6 : dayNum - 1;
        pts[index] += act.distance;
      });
      return pts;
    }

    if (selectedPeriod === 'month') {
      // 4 weeks of the month
      const pts = Array(4).fill(0);
      periodActivities.forEach(act => {
        const date = new Date(act.createdAt);
        const dom = date.getDate();
        const weekIdx = Math.min(Math.floor((dom - 1) / 7), 3);
        pts[weekIdx] += act.distance;
      });
      return pts;
    }

    // Year: 6 periods (Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec)
    const pts = Array(6).fill(0);
    periodActivities.forEach(act => {
      const date = new Date(act.createdAt);
      const month = date.getMonth(); // 0 to 11
      const biMonthIdx = Math.floor(month / 2);
      pts[biMonthIdx] += act.distance;
    });
    return pts;
  };

  const chartData = getChartPoints();
  const chartLabels = selectedPeriod === 'week' 
    ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
    : selectedPeriod === 'month'
      ? ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4']
      : ['Jan-Feb', 'Mar-Apr', 'Mei-Jun', 'Jul-Aug', 'Sep-Okt', 'Nov-Des'];

  // Render curved line SVG path
  const renderLineChart = () => {
    const width = Dimensions.get('window').width - 72; // Horizontal padding padding
    const height = 150;
    const maxVal = Math.max(...chartData, 5); // Default scale max to 5km
    const pointsCount = chartData.length;
    const xStep = width / (pointsCount - 1);
    
    // Map data to x, y coordinates
    const coordinates = chartData.map((val, idx) => {
      const x = idx * xStep;
      // Subtract from height because SVG y counts downwards
      const y = height - (val / maxVal) * (height - 30) - 15;
      return { x, y };
    });

    // Construct SVG path string (curved path using Bezier curves)
    let d = `M ${coordinates[0].x} ${coordinates[0].y}`;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const p0 = coordinates[i];
      const p1 = coordinates[i + 1];
      const cpX1 = p0.x + xStep / 2;
      const cpY1 = p0.y;
      const cpX2 = p1.x - xStep / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    // Path string for the background gradient fill under the line
    const fillD = `${d} L ${coordinates[coordinates.length - 1].x} ${height} L ${coordinates[0].x} ${height} Z`;

    return (
      <View style={styles.chartBox}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={Colors.light.primary} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={Colors.light.primary} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>
          
          {/* Gradient Fill Under Line */}
          <Path d={fillD} fill="url(#gradient)" />

          {/* Curved Orange Stroke Line */}
          <Path d={d} fill="none" stroke={Colors.light.primary} strokeWidth="3" />

          {/* Bullet points on the line */}
          {coordinates.map((coord, idx) => (
            <Circle 
              key={idx} 
              cx={coord.x} 
              cy={coord.y} 
              r="4" 
              fill={Colors.light.primary} 
              stroke="#FFF" 
              strokeWidth="2" 
            />
          ))}
        </Svg>
        
        {/* X-Axis labels */}
        <View style={styles.chartLabelsRow}>
          {chartLabels.map((lbl, idx) => (
            <Text key={idx} style={styles.chartLabelText}>{lbl}</Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistik</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Timeframe Toggles */}
          <View style={styles.periodContainer}>
            <TouchableOpacity 
              style={[styles.periodBtn, selectedPeriod === 'week' && styles.activePeriodBtn]}
              onPress={() => setSelectedPeriod('week')}
            >
              <Text style={[styles.periodText, selectedPeriod === 'week' && styles.activePeriodText]}>Minggu</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.periodBtn, selectedPeriod === 'month' && styles.activePeriodBtn]}
              onPress={() => setSelectedPeriod('month')}
            >
              <Text style={[styles.periodText, selectedPeriod === 'month' && styles.activePeriodText]}>Bulan</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.periodBtn, selectedPeriod === 'year' && styles.activePeriodBtn]}
              onPress={() => setSelectedPeriod('year')}
            >
              <Text style={[styles.periodText, selectedPeriod === 'year' && styles.activePeriodText]}>Tahun</Text>
            </TouchableOpacity>
          </View>

          {/* Metric 1: Distance */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Jarak</Text>
            <View style={styles.valueRow}>
              <Text style={styles.metricValue}>{totalDistance.toFixed(2)}</Text>
              <Text style={styles.metricUnit}>km</Text>
            </View>
            <View style={styles.trendRow}>
              <Ionicons name="arrow-up" size={14} color={Colors.light.success} />
              <Text style={styles.trendText}>+12% dari periode lalu</Text>
            </View>

            {/* Line Chart */}
            {renderLineChart()}
          </View>

          {/* Metric 2: Average Pace */}
          <View style={styles.metricCard}>
            <View style={styles.metricSplitRow}>
              <View style={styles.splitHalf}>
                <Text style={styles.metricLabel}>Pace Rata-rata</Text>
                <View style={styles.valueRow}>
                  <Text style={styles.metricValue}>{formatPace(averagePace)}</Text>
                  <Text style={styles.metricUnit}>/km</Text>
                </View>
                <View style={styles.trendRow}>
                  <Ionicons name="arrow-down" size={14} color={Colors.light.success} />
                  <Text style={styles.trendText}>-3% lebih cepat</Text>
                </View>
              </View>
              
              <View style={[styles.splitHalf, styles.splitDivider]}>
                <Text style={styles.metricLabel}>Kalori</Text>
                <View style={styles.valueRow}>
                  <Text style={styles.metricValue}>{totalCalories.toLocaleString()}</Text>
                  <Text style={styles.metricUnit}>kkal</Text>
                </View>
                <View style={styles.trendRow}>
                  <Ionicons name="arrow-up" size={14} color={Colors.light.success} />
                  <Text style={styles.trendText}>+15% lebih aktif</Text>
                </View>
              </View>
            </View>
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
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F3',
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E2E7',
  },
  periodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activePeriodBtn: {
    backgroundColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activePeriodText: {
    color: '#FFFFFF',
  },
  metricCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  metricUnit: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 4,
    fontWeight: '600',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    color: Colors.light.success,
    marginLeft: 4,
    fontWeight: '600',
  },
  chartBox: {
    marginTop: 20,
    alignItems: 'center',
  },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  chartLabelText: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  metricSplitRow: {
    flexDirection: 'row',
  },
  splitHalf: {
    flex: 1,
  },
  splitDivider: {
    borderLeftWidth: 1,
    borderColor: '#F0F0F3',
    paddingLeft: 20,
    marginLeft: 4,
  },
});
