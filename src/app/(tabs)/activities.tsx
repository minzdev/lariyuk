import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Activity, storageService } from '../../services/storageService';
import ActivityCard from '../../components/ActivityCard';
import { Ionicons } from '@expo/vector-icons';

type FilterType = 'all' | 'run' | 'walk' | 'bike';

export default function ActivitiesScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const loadActivities = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await storageService.getActivities();
      setActivities(data);
      applyFilters(data, activeFilter, searchQuery);
    } catch (error) {
      console.error("Failed to load activities in list", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [loadActivities])
  );

  function applyFilters(data: Activity[], filter: FilterType, query: string) {
    let result = [...data];

    // Filter by type
    if (filter !== 'all') {
      result = result.filter(act => act.type === filter);
    }

    // Filter by search query
    if (query.trim().length > 0) {
      result = result.filter(act => 
        act.title.toLowerCase().includes(query.toLowerCase()) ||
        (act.notes && act.notes.toLowerCase().includes(query.toLowerCase()))
      );
    }

    setFilteredActivities(result);
  }

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(activities, activeFilter, text);
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    applyFilters(activities, filter, searchQuery);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadActivities(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aktivitas</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.light.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari aktivitas..."
          placeholderTextColor={Colors.light.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeFilter === 'all' && styles.activeTabButton]}
          onPress={() => handleFilterChange('all')}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[styles.tabText, activeFilter === 'all' && styles.activeTabText]}>Semua</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeFilter === 'run' && styles.activeTabButton]}
          onPress={() => handleFilterChange('run')}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[styles.tabText, activeFilter === 'run' && styles.activeTabText]}>Lari</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeFilter === 'walk' && styles.activeTabButton]}
          onPress={() => handleFilterChange('walk')}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[styles.tabText, activeFilter === 'walk' && styles.activeTabText]}>Jalan</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeFilter === 'bike' && styles.activeTabButton]}
          onPress={() => handleFilterChange('bike')}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[styles.tabText, activeFilter === 'bike' && styles.activeTabText]}>Sepeda</Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : filteredActivities.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="fitness-outline" size={48} color={Colors.light.textSecondary} />
          <Text style={styles.emptyTitle}>Tidak ada aktivitas ditemukan</Text>
          <Text style={styles.emptySubtitle}>Mulailah melacak aktivitas olahraga Anda hari ini!</Text>
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              onPress={() => router.push(`/activity/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: Colors.light.text,
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginVertical: 16,
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#F0F0F3',
    borderWidth: 1,
    borderColor: '#E2E2E7',
  },
  activeTabButton: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
