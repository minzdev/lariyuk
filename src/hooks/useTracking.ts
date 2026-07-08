import { useState, useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Speech from 'expo-speech';
import { LatLng, Activity, storageService } from '../services/storageService';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Background location task error:", error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      DeviceEventEmitter.emit('background-location-update', locations[0]);
    }
  }
});

// Haversine formula to calculate distance in km between two points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getNowTimestamp = () => Date.now();

export const useTracking = () => {
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Stats
  const [duration, setDuration] = useState(0); // in seconds
  const [distance, setDistance] = useState(0); // in km
  const [pace, setPace] = useState(0); // in seconds/km
  const [calories, setCalories] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  
  // Refs for tracking mutable states inside intervals
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<any>(null);
  const routeRef = useRef<LatLng[]>([]);
  const lastLocationRef = useRef<LatLng | null>(null);
  const distanceRef = useRef<number>(0);
  const lastAnnouncedDistanceRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const paceRef = useRef<number>(0);
  const isTrackingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  const checkAndSpeakProgress = (currentDistance: number) => {
    const currentKm = Math.floor(currentDistance);
    if (currentKm > lastAnnouncedDistanceRef.current) {
      lastAnnouncedDistanceRef.current = currentKm;
      
      const totalSeconds = durationRef.current;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      const currentPace = paceRef.current;
      const paceMinutes = Math.floor(currentPace / 60);
      const paceSeconds = currentPace % 60;

      const speechText = 
        `Jarak ${currentKm} kilometer. ` +
        `Waktu ${minutes} menit ${seconds} detik. ` +
        `Kecepatan rata-rata ${paceMinutes} menit ${paceSeconds} detik per kilometer.`;

      try {
        Speech.speak(speechText, {
          language: 'id-ID',
          pitch: 1.0,
          rate: 0.95
        });
      } catch (err) {
        console.warn("Failed to play audio coach prompt:", err);
      }
    }
  };

  // Request foreground location permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          const initialLatLng: LatLng = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: loc.timestamp
          };
          setCurrentLocation(initialLatLng);
          lastLocationRef.current = initialLatLng;
        }
      } catch (err) {
        console.warn("Error requesting location permission:", err);
      }
    })();

    const subscription = DeviceEventEmitter.addListener('background-location-update', (location) => {
      handleLocationUpdate(location);
    });

    return () => {
      subscription.remove();
      stopLocationWatcher();
      clearTimer();
    };
  }, []);

  // Update route ref
  useEffect(() => {
    routeRef.current = routeCoordinates;
  }, [routeCoordinates]);

  // Clean up watchers
  function stopLocationWatcher() {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
  }

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Start GPS tracking
  const startLocationWatcher = async () => {
    stopLocationWatcher();
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 3, // Update every 3 meters
          timeInterval: 2000   // Or 2 seconds
        },
        (location) => {
          handleLocationUpdate(location);
        }
      );
    } catch (err) {
      console.error("Error watching position:", err);
    }
  };

  // Start background location updates (persists in background/lock screen)
  const startBackgroundLocationWatcher = async () => {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 3,
          foregroundService: {
            notificationTitle: "Lari Yuk Melacak Latihan Anda",
            notificationBody: "Aktivitas lari sedang direkam di latar belakang.",
            notificationColor: "#FF5722"
          }
        });
      } else {
        console.warn("Background location permission not granted.");
      }
    } catch (err) {
      console.error("Error starting background location updates:", err);
    }
  };

  // Handle new location update from GPS
  const handleLocationUpdate = (location: Location.LocationObject) => {
    if (isPausedRef.current) return;

    const { latitude, longitude, accuracy } = location.coords;
    setGpsAccuracy(accuracy ?? null);

    const newPoint: LatLng = {
      latitude,
      longitude,
      timestamp: location.timestamp
    };

    setCurrentLocation(newPoint);

    if (isTrackingRef.current && lastLocationRef.current) {
      // Calculate distance from last point
      const delta = calculateDistance(
        lastLocationRef.current.latitude,
        lastLocationRef.current.longitude,
        latitude,
        longitude
      );

      // Filter noise (unrealistic speed jumps or very small movements when stationary)
      if (delta > 0.002 && (accuracy === null || accuracy < 30)) {
        const newDistance = distanceRef.current + delta;
        distanceRef.current = newDistance;
        setDistance(newDistance);

        setRouteCoordinates((prev) => [...prev, newPoint]);
        lastLocationRef.current = newPoint;
        checkAndSpeakProgress(newDistance);
      }
    } else if (isTrackingRef.current) {
      setRouteCoordinates([newPoint]);
      lastLocationRef.current = newPoint;
    }
  };

  // Start tracking session
  const startTracking = async () => {
    // 1. Get initial location
    let startLoc = currentLocation;
    if (!startLoc) {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        startLoc = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp
        };
        setCurrentLocation(startLoc);
      } catch {
        // Fallback fallback center
        startLoc = { latitude: -6.2088, longitude: 106.8456, timestamp: getNowTimestamp() };
        setCurrentLocation(startLoc);
      }
    }

    setIsTracking(true);
    isTrackingRef.current = true;
    setIsPaused(false);
    isPausedRef.current = false;
    setDuration(0);
    setDistance(0);
    setPace(0);
    setCalories(0);
    setGpsAccuracy(5);
    distanceRef.current = 0;
    lastAnnouncedDistanceRef.current = 0;
    durationRef.current = 0;
    paceRef.current = 0;
    
    const initialPoint = startLoc;
    setRouteCoordinates([initialPoint]);
    lastLocationRef.current = initialPoint;

    // Start Timer
    clearTimer();
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setDuration((prev) => {
        const nextDuration = prev + 1;
        durationRef.current = nextDuration;
        
        // Recalculate Pace: duration / distance
        const currentDistance = distanceRef.current;
        if (currentDistance > 0.01) {
          const calculatedPace = Math.round(nextDuration / currentDistance);
          setPace(calculatedPace);
          paceRef.current = calculatedPace;
          
          // Est. Calories: Weight (~70kg) * distance
          setCalories(Math.round(75 * currentDistance));
        }
        return nextDuration;
      });
    }, 1000);

    // GPS Watch
    await startLocationWatcher();
    await startBackgroundLocationWatcher();
  };



  // Pause
  const pauseTracking = () => {
    setIsPaused(true);
    isPausedRef.current = true;
  };

  // Resume
  const resumeTracking = () => {
    setIsPaused(false);
    isPausedRef.current = false;
  };

  // Stop tracking and save to storage
  const stopTracking = async (type: 'run' | 'walk' | 'bike' = 'run', customTitle?: string): Promise<Activity | null> => {
    clearTimer();
    stopLocationWatcher();
    
    setIsTracking(false);
    isTrackingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;

    if (distanceRef.current < 0.05 && duration < 10) {
      // Too short to record, cancel
      resetTracking();
      return null;
    }

    // Determine title
    let title = customTitle;
    if (!title) {
      const hour = new Date().getHours();
      let timeStr = 'Pagi';
      if (hour >= 11 && hour < 15) timeStr = 'Siang';
      else if (hour >= 15 && hour < 19) timeStr = 'Sore';
      else if (hour >= 19 || hour < 4) timeStr = 'Malam';

      const typeStr = type === 'run' ? 'Lari' : type === 'walk' ? 'Jalan' : 'Sepeda';
      title = `${typeStr} ${timeStr}`;
    }

    const activity = await storageService.saveActivity({
      type,
      title,
      distance: Math.round(distanceRef.current * 100) / 100,
      duration,
      calories,
      pace,
      route: routeRef.current,
      createdAt: new Date().toISOString()
    });

    resetTracking();
    return activity;
  };

  // Reset tracking stats
  const resetTracking = () => {
    clearTimer();
    stopLocationWatcher();
    
    setIsTracking(false);
    isTrackingRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setDuration(0);
    setDistance(0);
    setPace(0);
    setCalories(0);
    setRouteCoordinates([]);
    setGpsAccuracy(null);
    lastAnnouncedDistanceRef.current = 0;
    durationRef.current = 0;
    paceRef.current = 0;
  };

  // Calculate GPS Signal Status
  const getGpsSignal = (): 'good' | 'poor' | 'weak' => {
    if (gpsAccuracy === null) return 'weak';
    if (gpsAccuracy <= 10) return 'good';
    if (gpsAccuracy <= 30) return 'poor';
    return 'weak';
  };

  return {
    currentLocation,
    routeCoordinates,
    isTracking,
    isPaused,
    duration,
    distance,
    pace,
    calories,
    gpsAccuracy,
    gpsSignal: getGpsSignal(),
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    resetTracking
  };
};
