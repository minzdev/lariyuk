import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch, 
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useTracking } from '../../hooks/useTracking';
import LockSlider from '../../components/LockSlider';
import { formatDuration, formatPace } from '../../components/ActivityCard';
import { Ionicons } from '@expo/vector-icons';

export default function TrackScreen() {
  const router = useRouter();
  const {
    currentLocation,
    routeCoordinates,
    isTracking,
    isPaused,
    duration,
    distance,
    pace,
    calories,
    gpsSignal,
    isSimulating,
    setIsSimulating,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    resetTracking
  } = useTracking();

  const [isLocked, setIsLocked] = useState(false);
  const mapRef = useRef<MapView | null>(null);

  // Auto-center map when location updates
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005
      }, 1000);
    }
  }, [currentLocation]);

  const handleStart = async () => {
    await startTracking();
  };

  const handlePause = () => {
    pauseTracking();
  };

  const handleResume = () => {
    resumeTracking();
  };

  const handleStop = () => {
    Alert.alert(
      'Selesaikan Aktivitas?',
      'Apakah Anda ingin menyimpan aktivitas olahraga ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Buang', 
          style: 'destructive',
          onPress: () => {
            resetTracking();
            setIsLocked(false);
          }
        },
        { 
          text: 'Simpan & Selesai', 
          onPress: async () => {
            // Ask user for activity type first
            Alert.alert(
              'Pilih Jenis Aktivitas',
              'Apa jenis olahraga yang Anda lakukan?',
              [
                { text: 'Jalan Santai', onPress: () => saveAndNavigate('walk') },
                { text: 'Lari', onPress: () => saveAndNavigate('run') },
                { text: 'Bersepeda', onPress: () => saveAndNavigate('bike') },
              ]
            );
          } 
        }
      ]
    );
  };

  const saveAndNavigate = async (type: 'run' | 'walk' | 'bike') => {
    const savedActivity = await stopTracking(type);
    setIsLocked(false);
    if (savedActivity) {
      Alert.alert(
        'Simpan Berhasil',
        'Aktivitas olahraga Anda telah berhasil disimpan!',
        [
          { 
            text: 'OK', 
            onPress: () => {
              router.replace('/(tabs)/activities');
            } 
          }
        ]
      );
    } else {
      Alert.alert('Info', 'Jarak terlalu pendek untuk disimpan.');
    }
  };

  const getSignalColor = () => {
    if (gpsSignal === 'good') return Colors.light.success;
    if (gpsSignal === 'poor') return Colors.light.warning;
    return Colors.light.danger;
  };

  const getSignalText = () => {
    if (gpsSignal === 'good') return 'GPS Baik';
    if (gpsSignal === 'poor') return 'GPS Kurang Stabil';
    return 'GPS Mencari Sinyal...';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Upper Status Panel */}
      <View style={styles.header}>
        <View style={styles.gpsContainer}>
          <View style={[styles.gpsDot, { backgroundColor: getSignalColor() }]} />
          <Text style={styles.gpsText}>{getSignalText()}</Text>
        </View>

        {!isTracking && (
          <View style={styles.simContainer}>
            <Text style={styles.simText}>Simulasi Lari (Demo):</Text>
            <Switch
              value={isSimulating}
              onValueChange={setIsSimulating}
              trackColor={{ false: '#767577', true: Colors.light.primary + '50' }}
              thumbColor={isSimulating ? Colors.light.primary : '#f4f3f4'}
            />
          </View>
        )}
        
        <TouchableOpacity style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      {/* Main Stats Display Panel */}
      <View style={styles.statsContainer}>
        {/* Massive Timer */}
        <Text style={styles.timerText}>{formatDuration(duration)}</Text>
        <Text style={styles.timerLabel}>DURASI</Text>

        {/* Dashboard Grid */}
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.gridVal}>{distance.toFixed(2)}</Text>
            <Text style={styles.gridLabel}>JARAK (km)</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.gridVal}>{formatPace(pace)}</Text>
            <Text style={styles.gridLabel}>PACE (/km)</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.gridVal}>{calories}</Text>
            <Text style={styles.gridLabel}>KALORI (kkal)</Text>
          </View>
        </View>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: currentLocation?.latitude || -6.2088,
            longitude: currentLocation?.longitude || 106.8456,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005
          }}
          showsUserLocation={!isSimulating}
          showsMyLocationButton={true}
        >
          {/* Breadcrumb path */}
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor={Colors.light.primary}
            />
          )}

          {/* Current Location/Simulated marker */}
          {currentLocation && (
            <Marker coordinate={currentLocation}>
              <View style={styles.markerCircle}>
                <View style={styles.markerInner} />
              </View>
            </Marker>
          )}
        </MapView>
      </View>

      {/* Control Actions & Locking Drawer */}
      <View style={styles.controlsContainer}>
        {isLocked ? (
          <LockSlider onLockStateChange={setIsLocked} isLocked={isLocked} />
        ) : (
          <View style={styles.actionsRow}>
            {/* If NOT tracking */}
            {!isTracking ? (
              <TouchableOpacity 
                style={styles.startButton} 
                onPress={handleStart}
                activeOpacity={0.8}
              >
                <Ionicons name="play-sharp" size={28} color="#FFF" style={{ marginLeft: 3 }} />
                <Text style={styles.startButtonText}>MULAI</Text>
              </TouchableOpacity>
            ) : (
              /* If tracking is active */
              <View style={styles.activeControls}>
                {/* Lock Button */}
                <TouchableOpacity 
                  style={[styles.smallBtn, styles.lockBtn]} 
                  onPress={() => setIsLocked(true)}
                >
                  <Ionicons name="lock-closed-outline" size={22} color={Colors.light.text} />
                </TouchableOpacity>

                {/* Pause / Resume button */}
                {isPaused ? (
                  <TouchableOpacity 
                    style={[styles.largeBtn, styles.resumeBtn]} 
                    onPress={handleResume}
                  >
                    <Ionicons name="play" size={32} color="#FFF" style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.largeBtn, styles.pauseBtn]} 
                    onPress={handlePause}
                  >
                    <Ionicons name="pause" size={32} color="#FFF" />
                  </TouchableOpacity>
                )}

                {/* Stop Button */}
                <TouchableOpacity 
                  style={[styles.smallBtn, styles.stopBtn]} 
                  onPress={handleStop}
                >
                  <Ionicons name="square" size={22} color={Colors.light.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
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
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  gpsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  simContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simText: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginRight: 6,
    fontWeight: '600',
  },
  settingsBtn: {
    padding: 4,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  timerText: {
    fontSize: 54,
    fontWeight: '900',
    color: Colors.light.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  timerLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#F0F0F3',
    paddingTop: 16,
  },
  gridCol: {
    alignItems: 'center',
    flex: 1,
  },
  gridVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  gridLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  controlsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderTopWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    height: 98,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  activeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  largeBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  pauseBtn: {
    backgroundColor: Colors.light.primary,
  },
  resumeBtn: {
    backgroundColor: Colors.light.success,
  },
  smallBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E2E7',
  },
  lockBtn: {
    backgroundColor: '#F0F0F3',
  },
  stopBtn: {
    backgroundColor: '#FFEFEB',
    borderColor: Colors.light.primary + '30',
  },
});
