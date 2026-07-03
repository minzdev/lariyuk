import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, isMock, auth } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';

export interface LatLng {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface Activity {
  id: string;
  userId: string;
  type: 'run' | 'walk' | 'bike';
  title: string;
  distance: number;      // in km
  duration: number;      // in seconds
  calories: number;      // in kcal
  pace: number;          // in seconds per km (e.g., 372 is 6:12 min/km)
  route: LatLng[];
  createdAt: string;     // ISO Timestamp
  notes?: string;
  synced: boolean;
}

const STORAGE_KEY = '@lariyuk_activities';
const GOAL_KEY = '@lariyuk_weekly_goal';

// Generate UUID fallback for mock or offline
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const storageService = {
  /**
   * Save an activity locally, and attempt to sync to Firestore if online & logged in.
   */
  async saveActivity(activityData: Omit<Activity, 'id' | 'userId' | 'synced'>): Promise<Activity> {
    const userId = auth.currentUser?.uid || 'anonymous';
    const id = generateId();
    
    const newActivity: Activity = {
      ...activityData,
      id,
      userId,
      synced: false
    };

    // 1. Save locally first
    const localActivities = await this.getLocalActivities();
    localActivities.unshift(newActivity);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localActivities));

    // 2. Try to sync to Firestore
    if (!isMock && auth.currentUser) {
      try {
        await addDoc(collection(db, 'activities'), {
          ...newActivity,
          id, // use same id for references
          synced: true // marked as synced in cloud
        });
        
        // Update local activity to be synced: true
        newActivity.synced = true;
        const updatedLocal = localActivities.map(a => a.id === id ? { ...a, synced: true } : a);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocal));
      } catch (error) {
        console.warn("Could not sync activity to Firebase (offline). Saved locally.", error);
      }
    }

    return newActivity;
  },

  /**
   * Get all activities. Merges cloud and local activities.
   */
  async getActivities(): Promise<Activity[]> {
    const local = await this.getLocalActivities();

    if (isMock || !auth.currentUser) {
      return local;
    }

    // Try to fetch latest from Firestore and merge
    try {
      const q = query(
        collection(db, 'activities'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const cloudActivities: Activity[] = [];
      querySnapshot.forEach((doc) => {
        cloudActivities.push(doc.data() as Activity);
      });

      // Merge local unsynced activities with cloud activities
      const unsynced = local.filter(a => !a.synced);
      
      // Combine and filter duplicates
      const combined = [...unsynced];
      cloudActivities.forEach(cloudAct => {
        if (!combined.some(c => c.id === cloudAct.id)) {
          combined.push(cloudAct);
        }
      });

      // Sort by date descending
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Save combined back to local storage for offline usage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      return combined;
    } catch (error) {
      console.warn("Could not fetch activities from Firebase. Returning offline cache.", error);
      return local;
    }
  },

  /**
   * Fetch raw local activities.
   */
  async getLocalActivities(): Promise<Activity[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const list = data ? JSON.parse(data) : [];
      const currentUid = auth.currentUser?.uid || 'anonymous';
      return list.filter((act: Activity) => act.userId === currentUid);
    } catch (e) {
      console.error("Failed to read local activities", e);
      return [];
    }
  },

  /**
   * Sync any unsynced offline activities to Firestore.
   */
  async syncUnsyncedActivities(): Promise<number> {
    if (isMock || !auth.currentUser) return 0;
    
    const local = await this.getLocalActivities();
    const unsynced = local.filter(a => !a.synced);
    
    if (unsynced.length === 0) return 0;

    let syncedCount = 0;
    try {
      // Sync one by one or in batch
      for (const activity of unsynced) {
        await addDoc(collection(db, 'activities'), {
          ...activity,
          synced: true
        });
        
        activity.synced = true;
        syncedCount++;
      }

      // Save back updated local list
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(local));
      console.log(`Successfully synced ${syncedCount} activities to Firebase.`);
    } catch (error) {
      console.error("Failed syncing offline activities to Firebase:", error);
    }

    return syncedCount;
  },

  /**
   * Get weekly goal (default 20km).
   */
  async getWeeklyGoal(): Promise<number> {
    try {
      const goal = await AsyncStorage.getItem(GOAL_KEY);
      return goal ? parseFloat(goal) : 20; // Default goal 20km
    } catch {
      return 20;
    }
  },

  /**
   * Set weekly goal.
   */
  async setWeeklyGoal(goal: number): Promise<void> {
    await AsyncStorage.setItem(GOAL_KEY, goal.toString());
  },

  /**
   * Helper: Aggregates distances for the current week (Sen, Sel, Rab, Kam, Jum, Sab, Min)
   * relative to a reference date.
   */
  getWeeklyPerformance(activities: Activity[]): { day: string; distance: number }[] {
    const result = [
      { day: 'Sen', distance: 0 },
      { day: 'Sel', distance: 0 },
      { day: 'Rab', distance: 0 },
      { day: 'Kam', distance: 0 },
      { day: 'Jum', distance: 0 },
      { day: 'Sab', distance: 0 },
      { day: 'Min', distance: 0 },
    ];

    const today = new Date();
    // Get start of this week (Monday)
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Filter activities in this week
    const thisWeeksActivities = activities.filter(a => {
      const date = new Date(a.createdAt);
      return date >= startOfWeek && date <= endOfWeek;
    });

    thisWeeksActivities.forEach(a => {
      const date = new Date(a.createdAt);
      const dayNum = date.getDay(); // 0 = Sun, 1 = Mon...
      
      // Map to index in result (Mon=0, Tue=1 ... Sun=6)
      const index = dayNum === 0 ? 6 : dayNum - 1;
      result[index].distance += a.distance;
    });

    // Format to 2 decimal places
    return result.map(r => ({ ...r, distance: Math.round(r.distance * 100) / 100 }));
  }
};
