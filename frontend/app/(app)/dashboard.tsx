import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Dimensions, SafeAreaView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { CairnLogo } from '../../components/CairnLogo';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [mockRankingCount, setMockRankingCount] = useState(7);
  const [viewMode, setViewMode] = useState<'feed' | 'mylist'>('feed');
  const [showFilters, setShowFilters] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const mockActivities = [
    { 
      id: '1', 
      user: 'Krish Patel', 
      trail: 'clouds rest', 
      trail_id: 101,
      location: 'yosemite national park',
      date: '2h ago', 
      rating: 8.42,
      definition: 'a peak in Yosemite National Park offering a 360-degree view of the entire park.',
      distance: '14.5 mi',
      elevation: '3,100 ft'
    },
    { 
      id: '2', 
      user: 'Sarah Jenkins', 
      trail: 'skyline trail', 
      trail_id: 102,
      location: 'mt. rainier',
      date: '5h ago', 
      rating: 7.95,
      definition: 'a loop trail in the Paradise area of Mount Rainier National Park with dramatic glacier views.',
      distance: '5.5 mi',
      elevation: '1,700 ft'
    },
    { 
      id: '3', 
      user: 'Alex Chen', 
      trail: 'angels landing', 
      trail_id: 103,
      location: 'zion national park',
      date: 'yesterday', 
      rating: 7.81,
      definition: 'a 1,488-foot tall rock formation in Zion National Park with narrow ridges and steep drops.',
      distance: '5.4 mi',
      elevation: '1,488 ft'
    },
  ];

  const userRankings = [
    {
      id: 'r1',
      trail: 'half dome',
      trail_id: 201,
      location: 'yosemite, ca',
      rating: 9.12,
      rank: 1,
      distance: '17.0 mi',
      elevation: '4,800 ft'
    },
    {
      id: 'r2',
      trail: 'clouds rest',
      trail_id: 101,
      location: 'yosemite, ca',
      rating: 8.42,
      rank: 2,
      distance: '14.5 mi',
      elevation: '3,100 ft'
    },
    {
      id: 'r3',
      trail: 'mt. tallac',
      trail_id: 203,
      location: 'lake tahoe, ca',
      rating: 7.65,
      rank: 3,
      distance: '10.2 mi',
      elevation: '3,250 ft'
    }
  ];

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      try {
        setIsSearching(true);
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/v1/routes/search?q=${text}`,
          { headers: { 'ngrok-skip-browser-warning': 'true' } }
        );
        const data = await response.json();
        if (Array.isArray(data)) {
          setSearchResults(data);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const toggleBookmark = async (routeId: number) => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/routes/bookmark/${routeId}?user_id=${user.id}`, 
        { 
          method: 'POST',
          headers: { 'ngrok-skip-browser-warning': 'true' } 
        }
      );
      const data = await response.json();
      if (data.status === 'bookmarked') {
        setBookmarks(prev => [...prev, routeId]);
      } else {
        setBookmarks(prev => prev.filter(id => id !== routeId));
      }
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  const handleSync = async () => {
    if (!user?.id) {
      Alert.alert("Error", "User not identified. Please sign in again.");
      return;
    }
    try {
      setIsSyncing(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/strava/sync?user_id=${user.id}`, 
        { 
          method: 'POST',
          headers: { 'ngrok-skip-browser-warning': 'true' } 
        }
      );
      const data = await response.json();
      if (response.ok) {
        Alert.alert("Sync Complete", `Imported ${data.synced} new activities.`);
      } else {
        throw new Error(data.detail || "Sync failed");
      }
    } catch (err: any) {
      Alert.alert("Sync Error", err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Minimal Nav */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={scrollToTop} style={styles.logoTouch}>
            <CairnLogo size={32} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowProfile(true)} 
            style={styles.profileTrigger}
          >
            <View style={styles.avatarMini}>
              <Text style={styles.avatarTextMini}>{user?.name?.[0] || 'U'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView 
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Back & Dashboard Title - Dictionary Style */}
          <View style={styles.dictionaryHeader}>
            <View style={styles.welcomeRow}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userNameText}>{user?.name || 'Explorer'}</Text>
            </View>
            
            <View style={styles.wordRow}>
              <Text style={styles.headerWord}>{viewMode === 'feed' ? 'feed' : 'rankings'}</Text>
            </View>
            <Text style={styles.headerPart}>noun • <Text style={styles.subheading}>{viewMode === 'feed' ? 'Trail feed' : 'My personal list'}</Text></Text>
            <Text style={styles.headerDefinition}>
              {viewMode === 'feed' 
                ? 'a real-time stream of trail activities and rankings from your mountain circle.'
                : 'your personal collection of trekked trails, ordered by your preference.'}
            </Text>
          </View>

          {/* View Switcher */}
          <View style={styles.viewSwitcher}>
            <TouchableOpacity 
              style={[styles.switchTab, viewMode === 'feed' && styles.switchTabActive]}
              onPress={() => setViewMode('feed')}
            >
              <Text style={[styles.switchText, viewMode === 'feed' && styles.switchTextActive]}>Mountain Circle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.switchTab, viewMode === 'mylist' && styles.switchTabActive]}
              onPress={() => setViewMode('mylist')}
            >
              <Text style={[styles.switchText, viewMode === 'mylist' && styles.switchTextActive]}>My Rankings</Text>
            </TouchableOpacity>
          </View>

          {/* Search & Filter Row */}
          <View style={styles.searchAndFilter}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="search trails..."
                placeholderTextColor={Colors.border}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
              />
              {isSearching && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>
            <TouchableOpacity 
              style={[styles.filterButton, showFilters && styles.filterButtonActive]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="options-outline" size={20} color={showFilters ? 'white' : Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Expandable Filters */}
          {showFilters && (
            <View style={styles.filtersDrawer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                <TouchableOpacity style={styles.filterChip}><Text style={styles.chipText}>Distance</Text></TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}><Text style={styles.chipText}>Elevation Gain</Text></TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}><Text style={styles.chipText}>Region</Text></TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}><Text style={styles.chipText}>Difficulty</Text></TouchableOpacity>
                <TouchableOpacity style={styles.filterChip}><Text style={styles.chipText}>State</Text></TouchableOpacity>
              </ScrollView>
            </View>
          )}
          
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((result) => (
                <TouchableOpacity 
                  key={result.id} 
                  style={styles.searchResultItem}
                  onPress={() => toggleBookmark(result.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{result.name}</Text>
                    <Text style={styles.resultElo}>{result.elo?.toFixed(2)} rating</Text>
                  </View>
                  <Ionicons 
                    name={bookmarks.includes(result.id) ? "bookmark" : "bookmark-outline"} 
                    size={20} 
                    color={bookmarks.includes(result.id) ? Colors.primary : Colors.border} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          {/* Content View */}
          {viewMode === 'feed' ? (
            /* Feed Mode */
            mockActivities.map((item) => (
              <View key={item.id} style={styles.activityEntry}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryWordRow}>
                    <Text style={styles.entryTrail}>{item.trail}</Text>
                  </View>
                  <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => toggleBookmark(item.trail_id)}>
                      <Ionicons 
                        name={bookmarks.includes(item.trail_id) ? "bookmark" : "bookmark-outline"} 
                        size={20} 
                        color={bookmarks.includes(item.trail_id) ? Colors.primary : Colors.textSecondary} 
                      />
                    </TouchableOpacity>
                    <View style={styles.eloBadge}>
                      <Text style={styles.eloText}>{item.rating.toFixed(2)} rating</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.entryMetadata}>
                  <Text style={styles.entryUser}>{item.user}</Text>
                  <Text style={styles.entryDot}> • </Text>
                  <Text style={styles.entryLocation}>{item.location}</Text>
                  <Text style={styles.entryDot}> • </Text>
                  <Text style={styles.entryTime}>{item.date}</Text>
                </View>

                <Text style={styles.entryDefinition}>
                  {item.definition}
                </Text>

                <View style={styles.entryActions}>
                  <View style={styles.trailMetric}>
                    <Ionicons name="resize-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.metricText}>{item.distance}</Text>
                  </View>
                  <View style={styles.trailMetric}>
                    <Ionicons name="trending-up-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.metricText}>{item.elevation} gain</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            /* My List Mode */
            userRankings.map((item) => (
              <View key={item.id} style={styles.rankItem}>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankNumber}>{item.rank}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rankTrailName}>{item.trail}</Text>
                    <Text style={styles.rankLocation}>{item.location}</Text>
                  </View>
                  <View style={styles.rankRatingContainer}>
                    <Text style={styles.rankRatingValue}>{item.rating.toFixed(2)}</Text>
                    <Text style={styles.rankRatingLabel}>rating</Text>
                  </View>
                </View>
                <View style={styles.rankMetrics}>
                  <Text style={styles.rankMetricText}>{item.distance} • {item.elevation} gain</Text>
                  <TouchableOpacity>
                    <Ionicons name="ellipsis-vertical" size={16} color={Colors.border} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Profile Overlay */}
      <Modal
        visible={showProfile}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalDismiss} 
            activeOpacity={1} 
            onPress={() => setShowProfile(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            <View style={styles.profileHeader}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>{user?.name?.[0] || 'U'}</Text>
              </View>
              <View>
                <View style={styles.modalWordRow}>
                  <Text style={styles.profileName}>{user?.name || 'Explorer'}</Text>
                </View>
                <Text style={styles.profilePart}>noun • <Text style={styles.handleSub}>@{(user?.name || 'explorer').toLowerCase().replace(' ', '')}</Text></Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>124</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>8</Text>
                <Text style={styles.statLabel}>Requests</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{mockRankingCount >= 10 ? mockRankingCount : `${mockRankingCount}/10`}</Text>
                <Text style={styles.statLabel}>{mockRankingCount >= 10 ? 'Trails Ranked' : 'Calibration'}</Text>
              </View>
            </View>

            {mockRankingCount < 10 && (
              <View style={styles.calibrationContainer}>
                <Text style={styles.calibrationTitle}>calibration progress</Text>
                <View style={styles.calibrationBarContainer}>
                  <View style={[styles.calibrationBar, { width: `${(mockRankingCount / 10) * 100}%` }]} />
                </View>
                <Text style={styles.calibrationSub}>
                  {10 - mockRankingCount} more ranked hikes to reveal your status.
                </Text>
              </View>
            )}

            <View style={styles.menuList}>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleSync}
                disabled={isSyncing}
              >
                <Ionicons name="sync-outline" size={22} color={Colors.primary} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>sync activities</Text>
                  <Text style={styles.menuItemSub}>Import from Strava</Text>
                </View>
                {isSyncing ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={Colors.border} />}
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="logo-octocat" size={22} color={Colors.text} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>go to strava</Text>
                  <Text style={styles.menuItemSub}>View your full profile</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={Colors.border} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => {
                  setShowProfile(false);
                  router.push('/settings');
                }}
              >
                <Ionicons name="settings-outline" size={22} color={Colors.text} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>settings</Text>
                  <Text style={styles.menuItemSub}>Preferences & Privacy</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.border} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItem, { marginTop: 20 }]} onPress={signOut}>
                <Ionicons name="log-out-outline" size={22} color={Colors.error} />
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemTitle, { color: Colors.error }]}>sign out</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  logoTouch: {
    padding: 4,
  },
  profileTrigger: {
    padding: 4,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextMini: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  dictionaryHeader: {
    marginBottom: 20,
  },
  welcomeRow: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  userNameText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  headerWord: {
    fontSize: 48,
    fontWeight: '300',
    color: Colors.text,
    letterSpacing: -1,
  },
  headerPhonetic: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  headerPart: {
    fontSize: 14,
    color: Colors.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  subheading: {
    color: Colors.textSecondary,
    fontStyle: 'normal',
    fontWeight: '600',
  },
  headerDefinition: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
    lineHeight: 24,
    fontWeight: '300',
  },
  viewSwitcher: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: Colors.surfaceSecondary,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  switchTabActive: {
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  switchText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  switchTextActive: {
    color: Colors.text,
    fontWeight: '700',
  },
  searchAndFilter: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    zIndex: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '300',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filtersDrawer: {
    marginBottom: 16,
  },
  filterChips: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  searchResults: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.border,
    zIndex: 100,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  resultElo: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 30,
  },
  activityEntry: {
    marginBottom: 40,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryWordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryTrail: {
    fontSize: 22,
    fontWeight: '300',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  entryPhonetic: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  eloBadge: {
    backgroundColor: 'rgba(67, 160, 71, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(67, 160, 71, 0.3)',
  },
  eloText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  entryMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryUser: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  entryLocation: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '300',
    fontStyle: 'italic',
  },
  entryTime: {
    fontSize: 13,
    color: '#666',
    fontWeight: '300',
  },
  entryDot: {
    color: Colors.border,
    marginHorizontal: 4,
  },
  entryDefinition: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontWeight: '300',
    marginBottom: 16,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 20,
  },
  trailMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  rankItem: {
    marginBottom: 30,
    backgroundColor: Colors.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  rankNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  rankTrailName: {
    fontSize: 18,
    fontWeight: '300',
    color: Colors.text,
  },
  rankLocation: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  rankRatingContainer: {
    alignItems: 'flex-end',
  },
  rankRatingValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  rankRatingLabel: {
    fontSize: 10,
    color: Colors.primary,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  rankMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rankMetricText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 0,
    alignSelf: 'center',
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 30,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalWordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '300',
    color: Colors.text,
  },
  modalPhonetic: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  profilePart: {
    fontSize: 14,
    color: Colors.primary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  handleSub: {
    color: Colors.textSecondary,
    fontStyle: 'normal',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 0,
    padding: 20,
    justifyContent: 'space-around',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  menuList: {
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 0,
    gap: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: Colors.text,
  },
  menuItemSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  calibrationContainer: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calibrationTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  calibrationBarContainer: {
    height: 6,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  calibrationBar: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  calibrationSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
});
