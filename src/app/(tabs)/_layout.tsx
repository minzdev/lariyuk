import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.textSecondary,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#EBEBEB',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      {/* 1. Beranda */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />

      {/* 2. Aktivitas (History) */}
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Aktivitas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "calendar" : "calendar-outline"} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />

      {/* 3. Mulai (Start Track - Middle Button) */}
      <Tabs.Screen
        name="track"
        options={{
          title: 'Mulai',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <View style={styles.middleButtonContainer}>
              <View style={[
                styles.middleButton,
                focused && styles.middleButtonActive
              ]}>
                <Ionicons 
                  name="play" 
                  size={24} 
                  color="#FFFFFF" 
                  style={{ marginLeft: 2 }} // center the play icon triangle
                />
              </View>
            </View>
          ),
        }}
      />

      {/* 4. Statistik */}
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Statistik',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "stats-chart" : "stats-chart-outline"} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />

      {/* 5. Profil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  middleButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? -5 : 5, // elevate slightly on iOS
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    width: 60,
  },
  middleButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  middleButtonActive: {
    transform: [{ scale: 1.05 }],
    backgroundColor: '#E05300', // slightly darker orange when active
  },
});
