import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { Colors } from '../constants/theme';
import { Activity } from '../services/storageService';
import { Ionicons } from '@expo/vector-icons';

interface ActivityCardProps {
  activity: Activity;
  onPress: () => void;
}

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatPace = (secondsPerKm: number): string => {
  if (!secondsPerKm || isNaN(secondsPerKm)) return "0'00\"";
  const m = Math.floor(secondsPerKm / 60);
  const s = secondsPerKm % 60;
  return `${m}'${s.toString().padStart(2, '0')}"`;
};

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day} ${month} ${year} • ${hours}:${minutes}`;
};

export default function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const hasRoute = activity.route && activity.route.length > 1;

  // Compute bounding region for static map
  const getInitialRegion = () => {
    if (!hasRoute) return null;
    
    // Find min/max coordinates
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    activity.route.forEach(p => {
      minLat = Math.min(minLat, p.latitude);
      maxLat = Math.max(maxLat, p.latitude);
      minLng = Math.min(minLng, p.longitude);
      maxLng = Math.max(maxLng, p.longitude);
    });

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const latDelta = Math.max((maxLat - minLat) * 1.5, 0.005);
    const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.005);

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const mapRegion = getInitialRegion();

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'walk': return 'walk-outline';
      case 'bike': return 'bicycle-outline';
      default: return 'stats-chart-outline'; // run
    }
  };

  const getIconColor = () => {
    switch (activity.type) {
      case 'walk': return Colors.light.success;
      case 'bike': return '#007AFF';
      default: return Colors.light.primary;
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '15' }]}>
          <Ionicons name={getActivityIcon()} size={22} color={getIconColor()} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{activity.title}</Text>
          <Text style={styles.date}>{formatDate(activity.createdAt)}</Text>
        </View>
        {!activity.synced && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline-outline" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statVal}>{activity.distance.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Jarak (km)</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statVal}>{formatDuration(activity.duration)}</Text>
          <Text style={styles.statLabel}>Waktu</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statVal}>{formatPace(activity.pace)}</Text>
          <Text style={styles.statLabel}>Pace (/km)</Text>
        </View>
      </View>

      {hasRoute && mapRegion && (
        <View style={styles.mapContainer} pointerEvents="none">
          <MapView
            style={styles.map}
            initialRegion={mapRegion}
            liteMode={true}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Polyline
              coordinates={activity.route}
              strokeWidth={3}
              strokeColor={Colors.light.primary}
            />
          </MapView>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  date: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offlineText: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCol: {
    flex: 1,
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  mapContainer: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
