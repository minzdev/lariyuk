import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

interface ChartItem {
  day: string;
  distance: number;
}

interface WeeklyChartProps {
  data: ChartItem[];
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  // Find max distance to scale the bar heights
  const distances = data.map(item => item.distance);
  const maxDistance = Math.max(...distances, 5); // Default scale max to 5km if all are 0

  const chartHeight = 120; // Height of the bar chart track

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>Performa Mingguan</Text>
      
      <View style={styles.chartWrapper}>
        {data.map((item, index) => {
          const barHeight = maxDistance > 0 ? (item.distance / maxDistance) * chartHeight : 0;
          const isToday = new Date().getDay() === (index === 6 ? 0 : index + 1); // Match day index (0 is Sun, Mon is 1)

          return (
            <View key={item.day} style={styles.column}>
              {/* Distance value above bar */}
              <Text style={[
                styles.distanceVal, 
                item.distance > 0 ? styles.activeVal : styles.inactiveVal
              ]}>
                {item.distance > 0 ? item.distance.toFixed(1) : ''}
              </Text>
              
              {/* Bar track and bar */}
              <View style={styles.barTrack}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: Math.max(barHeight, item.distance > 0 ? 6 : 0),
                      backgroundColor: isToday ? Colors.light.primary : '#FF7A33'
                    }
                  ]} 
                />
              </View>
              
              {/* Day label */}
              <Text style={[
                styles.dayLabel,
                isToday && styles.todayLabel
              ]}>
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 20,
  },
  chartWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingHorizontal: 4,
  },
  column: {
    alignItems: 'center',
    flex: 1,
  },
  distanceVal: {
    fontSize: 10,
    fontWeight: '600',
    height: 14,
    marginBottom: 6,
  },
  activeVal: {
    color: Colors.light.primary,
  },
  inactiveVal: {
    color: 'transparent',
  },
  barTrack: {
    height: 120,
    width: 12,
    backgroundColor: '#F0F0F3',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
  todayLabel: {
    color: Colors.light.primary,
    fontWeight: 'bold',
  },
});
