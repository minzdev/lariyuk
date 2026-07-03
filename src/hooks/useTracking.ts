import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { LatLng, Activity, storageService } from '../services/storageService';

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
  
  // Simulation config
  const [isSimulating, setIsSimulating] = useState(false);

  // Refs for tracking mutable states inside intervals
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<any>(null);
  const simulationIntervalRef = useRef<any>(null);
  const routeRef = useRef<LatLng[]>([]);
  const lastLocationRef = useRef<LatLng | null>(null);
  const distanceRef = useRef<number>(0);

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

    return () => {
      stopLocationWatcher();
      clearTimer();
      clearSimulation();
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
  }

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function clearSimulation() {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
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

  // Handle new location update from GPS
  const handleLocationUpdate = (location: Location.LocationObject) => {
    if (isPaused) return;

    const { latitude, longitude, accuracy } = location.coords;
    setGpsAccuracy(accuracy ?? null);

    const newPoint: LatLng = {
      latitude,
      longitude,
      timestamp: location.timestamp
    };

    setCurrentLocation(newPoint);

    if (isTracking && lastLocationRef.current) {
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
      }
    } else if (isTracking) {
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
    setIsPaused(false);
    setDuration(0);
    setDistance(0);
    setPace(0);
    setCalories(0);
    setGpsAccuracy(5);
    distanceRef.current = 0;
    
    const initialPoint = startLoc;
    setRouteCoordinates([initialPoint]);
    lastLocationRef.current = initialPoint;

    // Start Timer
    clearTimer();
    timerRef.current = setInterval(() => {
      setDuration((prev) => {
        const nextDuration = prev + 1;
        // Recalculate Pace: duration / distance
        const currentDistance = distanceRef.current;
        if (currentDistance > 0.01) {
          setPace(Math.round(nextDuration / currentDistance));
          // Est. Calories: Weight (~70kg) * distance
          setCalories(Math.round(75 * currentDistance));
        }
        return nextDuration;
      });
    }, 1000);

    // GPS Watch or Simulation
    if (isSimulating) {
      startSimulating(initialPoint);
    } else {
      await startLocationWatcher();
    }
  };

  // Start tracking simulation (adds simulated running path in a circle/wiggly line)
  const startSimulating = (startPoint: LatLng) => {
    clearSimulation();
    let lat = startPoint.latitude;
    let lng = startPoint.longitude;
    let angle = 0;

    simulationIntervalRef.current = setInterval(() => {
      if (isPaused) return;

      // Running speed: approx 3 meters/second (~11km/h)
      // 1 degree latitude = 111,000 meters
      // Add small wiggle to simulate path
      angle += 0.15;
      const speed = 0.00003; // Lat/Lng step size
      const dLat = speed * Math.cos(angle) + (Math.random() - 0.5) * 0.000005;
      const dLng = speed * Math.sin(angle) + (Math.random() - 0.5) * 0.000005;
      
      lat += dLat;
      lng += dLng;

      const simLoc: LatLng = {
        latitude: lat,
        longitude: lng,
        timestamp: getNowTimestamp()
      };

      setCurrentLocation(simLoc);

      // Add to distance
      if (lastLocationRef.current) {
        const delta = calculateDistance(
          lastLocationRef.current.latitude,
          lastLocationRef.current.longitude,
          simLoc.latitude,
          simLoc.longitude
        );
        const newDistance = distanceRef.current + delta;
        distanceRef.current = newDistance;
        setDistance(newDistance);
      }

      setRouteCoordinates((prev) => [...prev, simLoc]);
      lastLocationRef.current = simLoc;
      setGpsAccuracy(3); // Perfect simulated signal
    }, 1000);
  };

  // Pause
  const pauseTracking = () => {
    setIsPaused(true);
  };

  // Resume
  const resumeTracking = () => {
    setIsPaused(false);
  };

  // Stop tracking and save to storage
  const stopTracking = async (type: 'run' | 'walk' | 'bike' = 'run', customTitle?: string): Promise<Activity | null> => {
    clearTimer();
    clearSimulation();
    stopLocationWatcher();
    
    setIsTracking(false);
    setIsPaused(false);

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
    clearSimulation();
    stopLocationWatcher();
    
    setIsTracking(false);
    setIsPaused(false);
    setDuration(0);
    setDistance(0);
    setPace(0);
    setCalories(0);
    setRouteCoordinates([]);
    setGpsAccuracy(null);
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
    isSimulating,
    setIsSimulating,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    resetTracking
  };
};
