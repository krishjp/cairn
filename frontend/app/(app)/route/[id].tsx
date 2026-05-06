import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { useAuth } from '../../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'friends' | 'global'>('friends');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    if (route?.images) {
      setCurrentImageIndex((prev) => (prev + 1) % route.images.length);
    }
  };

  const prevImage = () => {
    if (route?.images) {
      setCurrentImageIndex((prev) => (prev - 1 + route.images.length) % route.images.length);
    }
  };

  useEffect(() => {
    fetchRouteDetail();
  }, [id, user?.id]);

  const fetchRouteDetail = async () => {
    try {
      const url = user?.id 
        ? `${API_URL}/api/v1/ranking/route/${id}?user_id=${user.id}`
        : `${API_URL}/api/v1/ranking/route/${id}`;

      const response = await fetch(url, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        }
      });
      const data = await response.json();
      setRoute(data);
      setCurrentImageIndex(0);
    } catch (error) {
      console.error('Error fetching route detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Hike not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const reviews = viewMode === 'friends' ? route.reviews.friends : route.reviews.global;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Image Section - Horizontal Gallery */}
      <View style={styles.headerWrapper}>
        <View style={styles.imageHeader}>
          {route.images && route.images.length > 0 ? (
            <Image 
              source={{ uri: route.images[currentImageIndex] }} 
              style={styles.headerImage} 
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.headerImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={48} color={Colors.border} />
            </View>
          )}

          {/* Slider Controls - Bottom Left */}
          {route.images && route.images.length > 1 && (
            <View style={styles.sliderControls}>
              <TouchableOpacity onPress={prevImage} style={styles.sliderBtn}>
                <Ionicons name="chevron-back" size={14} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.sliderDivider} />
              <TouchableOpacity onPress={nextImage} style={styles.sliderBtn}>
                <Ionicons name="chevron-forward" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
          
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>

          {route.images && route.images.length > 1 && (
            <View style={styles.galleryIndicator}>
              <Ionicons name="images-outline" size={12} color="#FFF" />
              <Text style={styles.galleryIndicatorText}>{currentImageIndex + 1} / {route.images.length}</Text>
            </View>
          )}
        </View>

        {/* Overlapping Title Box */}
        <View style={styles.titleOverlapBox}>
          <Text style={styles.routeName}>{route.name}</Text>
          <Text style={styles.locationSub}>Yosemite National Park • California</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Spacer for overlapping title */}
        <View style={{ height: 50 }} />
        {/* Rating Tiers */}
        <View style={styles.ratingGrid}>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingValue}>{route.personal_rating ? route.personal_rating.toFixed(2) : '--'}</Text>
            <Text style={styles.ratingLabel}>Personal</Text>
          </View>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingValue}>{route.circle_avg ? route.circle_avg.toFixed(2) : '--'}</Text>
            <Text style={styles.ratingLabel}>Circle</Text>
          </View>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingValue}>{route.global_rating ? route.global_rating.toFixed(2) : '--'}</Text>
            <Text style={styles.ratingLabel}>Global</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this hike</Text>
          <Text style={styles.descriptionText}>
            {route.description || "No description available yet for this trail. Calibration events will help define its status in the community."}
          </Text>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.reviewHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                onPress={() => setViewMode('friends')}
                style={[styles.toggleBtn, viewMode === 'friends' && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, viewMode === 'friends' && styles.toggleTextActive]}>Circle</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setViewMode('global')}
                style={[styles.toggleBtn, viewMode === 'global' && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, viewMode === 'global' && styles.toggleTextActive]}>Global</Text>
              </TouchableOpacity>
            </View>
          </View>

          {reviews.length > 0 ? (
            reviews.map((review: any, index: number) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewUserRow}>
                  <View>
                    <Text style={styles.reviewUser}>{review.user}</Text>
                    <Text style={styles.reviewDate}>{new Date(review.date).toLocaleDateString()}</Text>
                  </View>
                  {review.rating && (
                    <View style={styles.reviewRatingBadge}>
                      <Text style={styles.reviewRatingText}>{review.rating.toFixed(2)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.reviewText}>"{review.text}"</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No reviews from your {viewMode} group yet.</Text>
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.text,
    fontSize: 16,
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    backgroundColor: Colors.accent,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  imageHeader: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  headerWrapper: {
    position: 'relative',
    marginBottom: 0,
  },
  titleOverlapBox: {
    position: 'absolute',
    bottom: -40,
    left: 24,
    right: 24,
    backgroundColor: Colors.cardBackground,
    padding: 20,
    borderRadius: 2, // Minimalist dictionary feel
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  galleryIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    gap: 4,
  },
  galleryIndicatorText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  placeholderImage: {
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backCircle: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderControls: {
    position: 'absolute',
    bottom: 70, // Above the title overlap box
    left: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 20, // Above overlap box if needed
  },
  sliderBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  routeName: {
    color: Colors.text,
    fontSize: 42, // Large dictionary word
    fontFamily: 'Inter-Light',
    fontWeight: '300',
    letterSpacing: -1,
  },
  locationSub: {
    color: Colors.primary,
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic', // Part of speech style
  },
  content: {
    flex: 1,
    padding: 24,
  },
  ratingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 24,
  },
  ratingBox: {
    alignItems: 'center',
    flex: 1,
  },
  ratingValue: {
    fontSize: 28,
    color: Colors.text,
    fontFamily: 'Inter-Bold',
    fontWeight: '300',
  },
  ratingLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'lowercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
    fontWeight: '300',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 2, // Sharp
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 1, // Sharp
  },
  toggleBtnActive: {
    backgroundColor: Colors.border,
  },
  toggleText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  toggleTextActive: {
    color: Colors.text,
  },
  reviewCard: {
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 2, // Sharp
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewUser: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  reviewDate: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '300',
  },
  reviewRatingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 2,
    alignSelf: 'flex-start',
  },
  reviewRatingText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  reviewText: {
    color: Colors.text,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 22,
    fontWeight: '300',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});
