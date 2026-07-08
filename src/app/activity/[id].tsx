import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Share,
  Image
} from 'react-native';
import { useDialogs } from '../../context/DialogContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Polyline, Marker, UrlTile } from 'react-native-maps';
import { Colors } from '../../constants/theme';
import { Activity, storageService } from '../../services/storageService';
import { db, isMock } from '../../config/firebase';
import { doc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDuration, formatPace, formatDate } from '../../components/ActivityCard';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';

const VINTAGE_MAP_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#eae6db" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#5c5850" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#eae6db" }]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [{ "color": "#e0dcd0" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#cbdccb" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#f8f7f4" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#eddcb8" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#b8c9cd" }]
  }
];

const formatShareDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}j ${m}m`;
  }
  if (m > 0) {
    return `${m}m`;
  }
  return `${s}d`;
};

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const viewRef = useRef<any>(null);
  const [sharingImage, setSharingImage] = useState(false);
  const [fullScreenPreview, setFullScreenPreview] = useState(false);
  const { showToast, showConfirm } = useDialogs();

  const handleShareImage = async () => {
    if (!viewRef.current) return;
    setSharingImage(true);
    try {
      // Capture the card visually as a local PNG file
      const localUri = await viewRef.current.capture();

      // Send the image file directly to the native OS share dialog
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'image/png',
          dialogTitle: 'Bagikan Pencapaian Lari Yuk',
        });
      } else {
        showToast('Gagal', 'Fitur berbagi tidak didukung di perangkat ini.', 'error');
      }
    } catch (error) {
      console.error("Error capturing and sharing image:", error);
      showToast('Gagal', 'Terjadi kesalahan saat memproses gambar pencapaian.', 'error');
    } finally {
      setSharingImage(false);
    }
  };

  const handleNativeShare = async () => {
    if (!activity) return;
    try {
      const shareMessage = `🏃 Lari Yuk! \n` +
        `Saya baru saja menyelesaikan aktivitas *${activity.title}*!\n\n` +
        `📊 Statistik Latihan:\n` +
        `• Jarak: ${activity.distance.toFixed(2)} km\n` +
        `• Durasi: ${formatDuration(activity.duration)}\n` +
        `• Rata-rata Pace: ${formatPace(activity.pace)}/km\n` +
        `• Estimasi Kalori: ${activity.calories} kkal\n\n` +
        `Unduh aplikasi Lari Yuk dan pantau olahragamu!`;
      
      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const loadActivityDetail = useCallback(async () => {
    try {
      const activities = await storageService.getActivities();
      const found = activities.find(a => a.id === id);
      if (found) {
        setActivity(found);
        setNotes(found.notes || '');
      } else {
        showToast('Error', 'Aktivitas tidak ditemukan.', 'error');
        router.back();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadActivityDetail();
  }, [loadActivityDetail]);

  const handleSaveNotes = async () => {
    if (!activity) return;

    setSavingNotes(true);
    try {
      // 1. Update local storage
      const localActivities = await storageService.getLocalActivities();
      const updatedLocal = localActivities.map(a => 
        a.id === activity.id ? { ...a, notes } : a
      );
      await AsyncStorage.setItem('@lariyuk_activities', JSON.stringify(updatedLocal));

      // 2. Update Firestore if online & synced
      if (!isMock && activity.synced) {
        // Find document reference in Firebase
        try {
          const q = query(collection(db, 'activities'), where('id', '==', activity.id));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const fbDocId = snapshot.docs[0].id;
            await updateDoc(doc(db, 'activities', fbDocId), { notes });
          }
        } catch (firebaseErr) {
          console.warn("Could not sync updated notes to Firestore (offline).", firebaseErr);
        }
      }

      setActivity(prev => prev ? { ...prev, notes } : null);
      showToast('Sukses', 'Catatan aktivitas berhasil disimpan.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal', 'Terjadi kesalahan saat menyimpan catatan.', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDeleteActivity = () => {
    showConfirm(
      'Hapus Aktivitas',
      'Apakah Anda yakin ingin menghapus aktivitas olahraga ini secara permanen?',
      async () => {
        if (!activity) return;
        try {
          // 1. Delete from AsyncStorage
          const rawData = await AsyncStorage.getItem('@lariyuk_activities');
          const allActivities = rawData ? JSON.parse(rawData) : [];
          const updatedAll = allActivities.filter((a: any) => a.id !== activity.id);
          await AsyncStorage.setItem('@lariyuk_activities', JSON.stringify(updatedAll));

          // 2. Delete from Firestore if online & synced
          if (!isMock && activity.synced) {
            try {
              const q = query(collection(db, 'activities'), where('id', '==', activity.id));
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                const fbDocId = snapshot.docs[0].id;
                await deleteDoc(doc(db, 'activities', fbDocId));
              }
            } catch (firebaseErr) {
              console.warn("Could not delete from Firestore (offline).", firebaseErr);
            }
          }

          showToast('Sukses', 'Aktivitas berhasil dihapus.', 'success');
          router.back();
        } catch (err) {
          console.error(err);
          showToast('Gagal', 'Terjadi kesalahan saat menghapus aktivitas.', 'error');
        }
      },
      'Hapus',
      'Batal',
      'danger'
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!activity) return null;

  const hasRoute = activity.route && activity.route.length > 1;
  const startLoc = hasRoute ? activity.route[0] : null;
  const endLoc = hasRoute ? activity.route[activity.route.length - 1] : null;

  // Bounding box region calculation with outlier filtering and tight zoom
  const getRegion = () => {
    if (!hasRoute) return null;
    
    const start = activity.route[0];
    // Threshold coordinates: if the user ran a short distance (e.g. 0.21km), points further than 1.6km (0.015 degrees) are outliers.
    const maxDelta = Math.max(activity.distance * 0.02, 0.015);

    const filteredRoute = activity.route.filter(p => {
      const latDiff = Math.abs(p.latitude - start.latitude);
      const lngDiff = Math.abs(p.longitude - start.longitude);
      return latDiff < maxDelta && lngDiff < maxDelta;
    });

    const routeToUse = filteredRoute.length > 1 ? filteredRoute : activity.route;

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    routeToUse.forEach(p => {
      minLat = Math.min(minLat, p.latitude);
      maxLat = Math.max(maxLat, p.latitude);
      minLng = Math.min(minLng, p.longitude);
      maxLng = Math.max(maxLng, p.longitude);
    });

    // Dynamic scaling helper: For very short distances, expand view enough to resolve the path nicely.
    // For normal distances, use a balanced scale factor.
    let scaleMultiplier = 1.9;
    let minDelta = 0.009; // Default minimum delta around 1.0 km viewport

    if (activity.distance < 0.05) {
      // Extremely short track (e.g. 20 meters demo / test) -> require wider map view to see road context and path clearly
      scaleMultiplier = 8.5;
      minDelta = 0.0025; // (~270m)
    } else if (activity.distance < 0.5) {
      // Short distance (under 500m)
      scaleMultiplier = 3.5;
      minDelta = 0.005; // (~550m)
    } else if (activity.distance > 10) {
      // Long runs (over 10km) -> make bounds slightly tighter to not make the track line look microscopic
      scaleMultiplier = 1.4;
    }

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;

    const latDelta = Math.max((maxLat - minLat) * scaleMultiplier, minDelta);
    const lngDelta = Math.max((maxLng - minLng) * scaleMultiplier, minDelta);

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const mapRegion = getRegion();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header navigation bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{activity.title}</Text>
            <Text style={styles.headerSubtitle}>{formatDate(activity.createdAt)}</Text>
          </View>
          <TouchableOpacity onPress={handleDeleteActivity} style={styles.backBtn}>
            <Ionicons name="trash-outline" size={22} color={Colors.light.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Map Trail */}
          {hasRoute && mapRegion && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={mapRegion}
              >
                <Polyline
                  coordinates={activity.route}
                  strokeWidth={4}
                  strokeColor={Colors.light.primary}
                />
                
                {/* Start Flag pin */}
                {startLoc && (
                  <Marker coordinate={startLoc} title="Mulai">
                    <View style={[styles.pinCircle, { backgroundColor: Colors.light.success }]}>
                      <Ionicons name="flag" size={12} color="#FFF" />
                    </View>
                  </Marker>
                )}

                {/* End Flag pin */}
                {endLoc && (
                  <Marker coordinate={endLoc} title="Selesai">
                    <View style={[styles.pinCircle, { backgroundColor: Colors.light.danger }]}>
                      <Ionicons name="stop" size={10} color="#FFF" />
                    </View>
                  </Marker>
                )}
              </MapView>
            </View>
          )}

          {/* Stats Details Grid */}
          <View style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>JARAK</Text>
                <View style={styles.statValueRow}>
                  <Text style={styles.statVal}>{activity.distance.toFixed(2)}</Text>
                  <Text style={styles.statUnit}>km</Text>
                </View>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>WAKTU</Text>
                <Text style={styles.statVal}>{formatDuration(activity.duration)}</Text>
              </View>
            </View>

            <View style={[styles.statsGrid, { borderTopWidth: 1, borderColor: '#F0F0F3', marginTop: 16, paddingTop: 16 }]}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>PACE RATA-RATA</Text>
                <View style={styles.statValueRow}>
                  <Text style={styles.statVal}>{formatPace(activity.pace)}</Text>
                  <Text style={styles.statUnit}>/km</Text>
                </View>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>EST. KALORI</Text>
                <View style={styles.statValueRow}>
                  <Text style={styles.statVal}>{activity.calories}</Text>
                  <Text style={styles.statUnit}>kkal</Text>
                </View>
              </View>
            </View>
          </View>

          {/* User Notes Input Section */}
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>Catatan & Evaluasi Latihan</Text>
            <Text style={styles.notesSubtitle}>Bagaimana latihan Anda hari ini? Tuliskan di sini.</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Contoh: Napas teratur, kaki terasa pegal di km 3, cuaca sedikit mendung..."
              placeholderTextColor={Colors.light.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline={true}
              numberOfLines={4}
              maxLength={200}
            />
            
            <TouchableOpacity 
              style={[styles.saveNotesBtn, savingNotes && { opacity: 0.7 }]}
              onPress={handleSaveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveNotesText}>Simpan Catatan</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Share Achievement Button */}
          <TouchableOpacity 
            style={styles.shareActivityBtn}
            onPress={() => setShowShareModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="share-social-outline" size={20} color={Colors.light.primary} style={{ marginRight: 8 }} />
            <Text style={styles.shareActivityText}>Bagikan Pencapaian</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Share Card Modal */}
        <Modal
          visible={showShareModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            if (fullScreenPreview) {
              setFullScreenPreview(false);
            } else {
              setShowShareModal(false);
            }
          }}
        >
          {fullScreenPreview ? (
            /* Full Screen Mode (Clean screenshot mode, pure black background, absolute silence) */
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => setFullScreenPreview(false)}
              style={[styles.modalOverlay, { backgroundColor: '#000000', padding: 0 }]}
            >
              <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                {/* The card preview centered */}
                <View style={[styles.shareCardContainer, { width: '100%', maxWidth: 360 }]}>
                  {hasRoute && mapRegion ? (
                    <View style={StyleSheet.absoluteFill}>
                      <MapView
                        style={styles.shareMap}
                        initialRegion={mapRegion}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                        customMapStyle={VINTAGE_MAP_STYLE}
                      >
                        <Polyline
                          coordinates={activity.route}
                          strokeWidth={6}
                          strokeColor="#FF5722"
                        />
                        {startLoc && (
                          <Marker coordinate={startLoc}>
                            <View style={[styles.pinCircleSmall, { backgroundColor: Colors.light.success }]} />
                          </Marker>
                        )}
                        {endLoc && (
                          <Marker coordinate={endLoc}>
                            <View style={[styles.pinCircleSmall, { backgroundColor: Colors.light.danger }]} />
                          </Marker>
                        )}
                      </MapView>
                      {/* Vintage overlay amber photo filter */}
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(235, 215, 180, 0.07)', pointerEvents: 'none', zIndex: 2 }]} />
                    </View>
                  ) : (
                    <View style={[styles.shareMap, { backgroundColor: '#E2E2E7', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="map-outline" size={48} color="#8E8E93" />
                    </View>
                  )}

                  {/* Top Right Watermark Brand Logo */}
                  <View style={styles.cardWatermarkContainer}>
                    <Image
                      source={require('../../../assets/images/tabIcons/logo.png')}
                      style={styles.cardBrandLogo}
                      resizeMode="contain"
                    />
                  </View>

                  {/* bottom stats row - Strava Style Minimalist */}
                  <View style={styles.cardTextOverlay}>
                    {/* Activity Type Icon & Title */}
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons 
                          name={activity.type === 'walk' ? 'walk' : activity.type === 'bike' ? 'bicycle' : 'trail-sign'} 
                          size={18} 
                          color="#FFFFFF" 
                          style={{ marginRight: 6 }} 
                        />
                        <Text style={styles.cardActivityTitle} numberOfLines={1}>
                          {activity.title}
                        </Text>
                      </View>
                    </View>

                    {/* Stats List - Minimal Clean Vertical Stack */}
                    <View style={styles.stravaStatsContainer}>
                      <View style={styles.stravaStatItem}>
                        <Text style={styles.stravaLabel}>Pace</Text>
                        <Text style={styles.stravaValue}>{formatPace(activity.pace)} /km</Text>
                      </View>
                      
                      <View style={styles.stravaStatItem}>
                        <Text style={styles.stravaLabel}>Waktu</Text>
                        <Text style={styles.stravaValue}>{formatShareDuration(activity.duration)}</Text>
                      </View>

                      <View style={styles.stravaStatItem}>
                        <Text style={styles.stravaLabel}>Jarak</Text>
                        <Text style={styles.stravaValue}>{activity.distance.toFixed(2)} km</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Subdued text placed outside of the card area so it doesn't pollute screenshots */}
                <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, marginTop: 24, fontWeight: '500' }}>
                  Ketuk di mana saja untuk kembali
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            /* Regular Modal Mode - Minimal design with close button only */
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Ionicons name="sparkles-outline" size={20} color={Colors.light.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.modalTitle}>Kartu Bagikan Lari Yuk</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowShareModal(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={Colors.light.text} />
                  </TouchableOpacity>
                </View>

                {/* Card Container (Portrait Preview) */}
                <TouchableOpacity 
                  activeOpacity={0.9} 
                  onPress={() => setFullScreenPreview(true)}
                  style={styles.shareCardContainer}
                >
                  {hasRoute && mapRegion ? (
                    <View style={StyleSheet.absoluteFill}>
                      <MapView
                        style={styles.shareMap}
                        initialRegion={mapRegion}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                        customMapStyle={VINTAGE_MAP_STYLE}
                      >
                        <Polyline
                          coordinates={activity.route}
                          strokeWidth={5}
                          strokeColor="#FF5722"
                        />
                        {startLoc && (
                          <Marker coordinate={startLoc}>
                            <View style={[styles.pinCircleSmall, { backgroundColor: Colors.light.success }]} />
                          </Marker>
                        )}
                        {endLoc && (
                          <Marker coordinate={endLoc}>
                            <View style={[styles.pinCircleSmall, { backgroundColor: Colors.light.danger }]} />
                          </Marker>
                        )}
                      </MapView>
                      {/* Vintage overlay amber photo filter */}
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(235, 215, 180, 0.07)', pointerEvents: 'none', zIndex: 2 }]} />
                    </View>
                  ) : (
                    <View style={[styles.shareMap, { backgroundColor: '#E2E2E7', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="map-outline" size={48} color="#8E8E93" />
                    </View>
                  )}

                  {/* Top Right Watermark Brand Logo */}
                  <View style={styles.cardWatermarkContainer}>
                    <Image
                      source={require('../../../assets/images/tabIcons/logo.png')}
                      style={styles.cardBrandLogo}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Dark Gradient-like Text Overlay - Strava Style Minimalist */}
                  <View style={styles.cardTextOverlay}>
                    {/* Activity Type Icon & Title */}
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons 
                          name={activity.type === 'walk' ? 'walk' : activity.type === 'bike' ? 'bicycle' : 'trail-sign'} 
                          size={18} 
                          color="#FFFFFF" 
                          style={{ marginRight: 6 }} 
                        />
                        <Text style={styles.cardActivityTitle} numberOfLines={1}>
                          {activity.title}
                        </Text>
                      </View>
                    </View>

                    {/* Stats List - Minimal Clean Vertical Stack */}
                    <View style={styles.stravaStatsContainer}>
                      <View style={styles.stravaStatItem}>
                        <Text style={styles.stravaLabel}>Pace</Text>
                        <Text style={styles.stravaValue}>{formatPace(activity.pace)} /km</Text>
                      </View>
                      
                      <View style={styles.stravaStatItem}>
                        <Text style={styles.stravaLabel}>Waktu</Text>
                        <Text style={styles.stravaValue}>{formatShareDuration(activity.duration)}</Text>
                      </View>

                      <View style={styles.stravaStatItem}>
                        <Text style={styles.stravaLabel}>Jarak</Text>
                        <Text style={styles.stravaValue}>{activity.distance.toFixed(2)} km</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Subdued text helper under the preview card */}
                <Text style={{ fontSize: 11, color: Colors.light.textSecondary, marginTop: 16, fontWeight: '600', textAlign: 'center' }}>
                  Ketuk kartu di atas untuk memperbesar & ambil tangkapan layar (screenshot)
                </Text>
              </View>
            </View>
          )}
        </Modal>

        {/* Off-screen ViewShot container for robust sharing capture (360x600 = Portrait 0.6) */}
        <View style={{ position: 'absolute', left: -9999, top: 0, width: 360, height: 600, opacity: 0 }} pointerEvents="none">
          <ViewShot 
            ref={viewRef} 
            options={{ format: 'png', quality: 1.0 }}
            style={{ width: 360, height: 600 }}
          >
            <View style={[styles.shareCardContainer, { width: 360, height: 600, borderRadius: 0, borderWidth: 0 }]}>
              {hasRoute && mapRegion ? (
                <View style={StyleSheet.absoluteFill}>
                  <MapView
                    style={styles.shareMap}
                    initialRegion={mapRegion}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    customMapStyle={VINTAGE_MAP_STYLE}
                  >
                    <Polyline
                      coordinates={activity.route}
                      strokeWidth={6} // Thicker trail for download
                      strokeColor="#FF5722"
                    />
                    {startLoc && (
                      <Marker coordinate={startLoc}>
                        <View style={[styles.pinCircleSmall, { backgroundColor: Colors.light.success }]} />
                      </Marker>
                    )}
                    {endLoc && (
                      <Marker coordinate={endLoc}>
                        <View style={[styles.pinCircleSmall, { backgroundColor: Colors.light.danger }]} />
                      </Marker>
                    )}
                  </MapView>
                  {/* Vintage overlay amber photo filter */}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(235, 215, 180, 0.07)', pointerEvents: 'none', zIndex: 2 }]} />
                </View>
              ) : (
                <View style={[styles.shareMap, { backgroundColor: '#E2E2E7', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="map-outline" size={48} color="#8E8E93" />
                </View>
              )}

              {/* Top Right Watermark Brand Logo */}
              <View style={styles.cardWatermarkContainer}>
                <Image
                  source={require('../../../assets/images/tabIcons/logo.png')}
                  style={styles.cardBrandLogo}
                  resizeMode="contain"
                />
              </View>

              {/* Dark Gradient-like Text Overlay - Strava Style Minimalist */}
              <View style={styles.cardTextOverlay}>
                {/* Activity Type Icon & Title */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons 
                      name={activity.type === 'walk' ? 'walk' : activity.type === 'bike' ? 'bicycle' : 'trail-sign'} 
                      size={18} 
                      color="#FFFFFF" 
                      style={{ marginRight: 6 }} 
                    />
                    <Text style={styles.cardActivityTitle} numberOfLines={1}>
                      {activity.title}
                    </Text>
                  </View>
                </View>

                {/* Stats List - Minimal Clean Vertical Stack */}
                <View style={styles.stravaStatsContainer}>
                  <View style={styles.stravaStatItem}>
                    <Text style={styles.stravaLabel}>Pace</Text>
                    <Text style={styles.stravaValue}>{formatPace(activity.pace)} /km</Text>
                  </View>
                  
                  <View style={styles.stravaStatItem}>
                    <Text style={styles.stravaLabel}>Waktu</Text>
                    <Text style={styles.stravaValue}>{formatShareDuration(activity.duration)}</Text>
                  </View>

                  <View style={styles.stravaStatItem}>
                    <Text style={styles.stravaLabel}>Jarak</Text>
                    <Text style={styles.stravaValue}>{activity.distance.toFixed(2)} km</Text>
                  </View>
                </View>
              </View>
            </View>
          </ViewShot>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  backBtn: {
    padding: 8,
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  mapContainer: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 20,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pinCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statsCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statVal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 4,
  },
  statUnit: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginLeft: 2,
    fontWeight: '600',
  },
  notesCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 40,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  notesSubtitle: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  notesInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 12,
    height: 90,
    color: Colors.light.text,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  saveNotesBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveNotesText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 14, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '100%',
    maxWidth: 350,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  modalCloseBtn: {
    backgroundColor: '#F0F0F3',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCardContainer: {
    width: '100%',
    aspectRatio: 0.6, // Taller portrait ratio (similar to 9:16)
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#E2E2E7',
    backgroundColor: '#F8F9FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  shareMap: {
    ...StyleSheet.absoluteFillObject,
  },
  cardWatermarkContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10, // Ensure logo is drawn above the MapView
  },
  cardBrandLogo: {
    width: 90,
    height: 28,
  },
  cardTextOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Translucent dark overlay spanning the full bottom area
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  cardTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  cardTypeTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardActivityTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900', // Ultra bold premium title
    letterSpacing: 0.3,
  },
  stravaStatsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 10,
    gap: 6,
  },
  stravaStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  stravaLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  stravaValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  pinCircleSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E2E7',
  },
  shareHelpText: {
    fontSize: 10.5,
    color: Colors.light.textSecondary,
    flex: 1,
    lineHeight: 15,
    fontWeight: '500',
  },
  nativeShareBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nativeShareText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  shareActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    borderRadius: 12,
    height: 48,
    marginTop: 12,
    marginBottom: 20,
  },
  shareActivityText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  textShareBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  textShareText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
