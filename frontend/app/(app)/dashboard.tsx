import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Dimensions, SafeAreaView, ActivityIndicator, TextInput } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { CairnLogo } from '../../components/CairnLogo';
import { router, useFocusEffect } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function Dashboard() {
  const { user, token, signOut, signIn } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [mockRankingCount, setMockRankingCount] = useState(7);
  const [viewMode, setViewMode] = useState<'feed' | 'mylist'>('feed');
  const [showFilters, setShowFilters] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [userRankings, setUserRankings] = useState<any[]>([]);
  const [unmatchedActivities, setUnmatchedActivities] = useState<any[]>([]);
  const [showScores, setShowScores] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [requestCount, setRequestCount] = useState(0);
  const [mockName, setMockName] = useState('');
  const [sentCount, setSentCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);

  // Matching Modal State
  const [isMatchModalVisible, setIsMatchModalVisible] = useState(false);
  const [matchingActivity, setMatchingActivity] = useState<any>(null);
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [matchSearchResults, setMatchSearchResults] = useState<any[]>([]);
  const [isMatchSearching, setIsMatchSearching] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  // Re-fetch data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        if (viewMode === 'feed') {
          fetchActivities();
        } else {
          fetchUserRankings();
        }
        fetchRequestCount();
      }
    }, [user, viewMode])
  );

  const fetchActivities = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/strava/feed`,
        { 
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          } 
        }
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setActivities(data);
      }
    } catch (err) {
      console.error("Failed to fetch feed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRankings = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/ranking/personal-leaderboard`,
        { 
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          } 
        }
      );
      const data = await response.json();
      if (data) {
        if (data.routes) {
          // Sort so unranked (is_ranked = false) are always at the top
          const sorted = data.routes.sort((a: any, b: any) => {
            if (a.is_ranked === b.is_ranked) return 0;
            return a.is_ranked ? 1 : -1;
          });
          setUserRankings(sorted);
        } else {
          setUserRankings([]);
        }

        if (data.unmatched_activities) {
          setUnmatchedActivities(data.unmatched_activities);
        } else {
          setUnmatchedActivities([]);
        }

        setShowScores(data.show_scores);
      } else {
        setUserRankings([]);
        setUnmatchedActivities([]);
        setShowScores(false);
      }
    } catch (err) {
      console.error("Failed to fetch rankings:", err);
      setUserRankings([]);
      setUnmatchedActivities([]);
      setShowScores(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRequestCount = async () => {
    if (!token) return;
    try {
      // Fetch incoming requests
      const reqResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/requests`,
        { 
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          } 
        }
      );
      const reqData = await reqResponse.json();
      if (Array.isArray(reqData)) {
        setRequestCount(reqData.length);
      }

      // Fetch friends/following/sent
      const friendsResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/friends`,
        { 
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          } 
        }
      );
      const friendsData = await friendsResponse.json();
      if (friendsData) {
        setFollowingCount(friendsData.following?.length || 0);
        setFollowersCount(friendsData.followers?.length || 0);
        setSentCount(friendsData.sent?.length || 0);
      }
    } catch (err) {
      console.error("Failed to fetch social stats:", err);
    }
  };

  const handleMockLogin = async () => {
    if (!mockName.trim() || !token) return;
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/mock-login?display_name=${encodeURIComponent(mockName)}`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        setShowProfile(false);
        signIn({
          id: data.user.id,
          name: data.user.display_name,
          username: data.user.username,
          isAdmin: data.user.is_admin,
          isPrivate: data.user.is_private,
          token: data.token,
        });
      }
    } catch (error) {
      console.error('Mock login failed:', error);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      try {
        setIsSearching(true);
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/v1/routes/search?q=${text}`,
          { 
            headers: { 
              'ngrok-skip-browser-warning': 'true',
              'Authorization': `Bearer ${token}`
            } 
          }
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

  const handleMatchSearch = async (text: string) => {
    setMatchSearchQuery(text);
    if (text.length > 2) {
      try {
        setIsMatchSearching(true);
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/v1/routes/search?q=${text}`,
          { 
            headers: { 
              'ngrok-skip-browser-warning': 'true',
              'Authorization': `Bearer ${token}`
            } 
          }
        );
        const data = await response.json();
        if (Array.isArray(data)) {
          setMatchSearchResults(data);
        } else {
          setMatchSearchResults([]);
        }
      } catch (err) {
        console.error('Match search error:', err);
        setMatchSearchResults([]);
      } finally {
        setIsMatchSearching(false);
      }
    } else {
      setMatchSearchResults([]);
    }
  };

  const promoteActivity = async (routeId: number) => {
    if (!matchingActivity || isPromoting) return;

    setIsPromoting(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/strava/promote?activity_id=${matchingActivity.id}&route_id=${routeId}`,
        {
          method: 'POST',
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      if (data.status === 'success') {
        setIsMatchModalVisible(false);
        setMatchingActivity(null);
        setMatchSearchQuery('');
        setMatchSearchResults([]);
        fetchUserRankings(); // Refresh
      }
    } catch (err) {
      console.error('Promotion error:', err);
    } finally {
      setIsPromoting(false);
    }
  };

  const ignoreActivity = async (activityId: string) => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/strava/ignore?activity_id=${activityId}`,
        {
          method: 'POST',
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      if (data.status === 'success') {
        fetchUserRankings(); // Refresh
      }
    } catch (err) {
      console.error('Ignore error:', err);
    }
  };

  const toggleBookmark = async (routeId: string) => {
    if (!user?.id) return;
    setBookmarks(prev =>
      prev.includes(routeId)
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const ActivityCard = ({ item, isRankView = false, isStaging = false }: { item: any, isRankView?: boolean, isStaging?: boolean }) => (
    <View key={item.id} style={[
      styles.activityCard,
      !item.is_ranked && isRankView && styles.unrankedCard,
      isStaging && styles.stagingCard
    ]}>
      <View style={styles.cardHeader}>
        <TouchableOpacity 
          style={styles.trailTitleRow} 
          onPress={() => {
            const routeId = item.canonical_route_id || item.id;
            if (routeId && !isStaging) {
              router.push(`/route/${routeId}`);
            }
          }}
        >
          <Text style={styles.trailNameText}>{item.trail_name || item.name}</Text>
        </TouchableOpacity>
        <View style={[styles.ratingBadge, isStaging && { borderColor: Colors.border }]}>
          <Text style={[styles.ratingValueText, isStaging && { color: Colors.textSecondary }]}>
            {isStaging
              ? '--'
              : (!isRankView)
                ? (item.global_rating || 0).toFixed(2)
                : (item.is_ranked && showScores)
                  ? (item.personal_score || 0).toFixed(2)
                  : '--'}
          </Text>
          <Text style={[styles.ratingLabelText, isStaging && { color: Colors.textSecondary }]}>
            {(isRankView && item.bucket) ? item.bucket : 'rating'}
          </Text>
        </View>
      </View>

      <View style={styles.cardMetadata}>
        <Text style={styles.userName}>{item.user_name || user?.name || 'Explorer'}</Text>
        <Text style={styles.dotSeparator}> • </Text>
        <Text style={styles.dateText}>
          {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'recent'}
        </Text>
        {isStaging && (
          <>
            <Text style={styles.dotSeparator}> • </Text>
            <View style={styles.stagingBadge}>
              <Text style={styles.stagingBadgeText}>Unmatched Activity</Text>
            </View>
          </>
        )}
        {!item.is_ranked && isRankView && !isStaging && (
          <>
            <Text style={styles.dotSeparator}> • </Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending Calibration</Text>
            </View>
          </>
        )}
      </View>

      {(isRankView ? (item.public_comment || item.notes) : item.public_comment) ? (
        <Text style={styles.activityNotes} numberOfLines={2}>
          "{isRankView ? (item.public_comment || item.notes) : item.public_comment}"
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.metricsGroup}>
          <View style={styles.footerMetric}>
            <Ionicons name="resize-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metricLabel}>
              {((item.distance || item.distance_meters || 0) / 1609.34).toFixed(1)} mi
            </Text>
          </View>
          <View style={styles.footerMetric}>
            <Ionicons name="timer-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metricLabel}>
              {item.moving_time ? Math.floor(item.moving_time / 60) : '—'} min
            </Text>
          </View>
        </View>

        {isStaging ? (
          <View style={styles.stagingActions}>
            <TouchableOpacity
              style={styles.ignoreAction}
              onPress={() => ignoreActivity(item.id)}
            >
              <Ionicons name="eye-off-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.promoteAction}
              onPress={() => {
                setMatchingActivity(item);
                setIsMatchModalVisible(true);
              }}
            >
              <Text style={styles.rankNowActionText}>Promote to Trail</Text>
              <Ionicons name="sparkles" size={12} color="white" />
            </TouchableOpacity>
          </View>
        ) : !item.is_ranked && isRankView ? (
          <TouchableOpacity
            style={styles.rankNowAction}
            onPress={() => router.push(`/ranking?fixed_id=${item.canonical_route_id || item.id}`)}
          >
            <Text style={styles.rankNowActionText}>Rank This Hike</Text>
            <Ionicons name="arrow-forward" size={12} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={styles.socialGroup}>
            <View style={styles.socialItem}>
              <Ionicons name="heart-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.socialCount}>{item.reactions_count || 0}</Text>
            </View>
            <View style={styles.socialItem}>
              <Ionicons name="chatbubble-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.socialCount}>{item.comments_count || 0}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Minimal Nav */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={scrollToTop} style={styles.logoTouch}>
            <CairnLogo size={32} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity
              onPress={() => setShowProfile(true)}
              style={styles.profileTrigger}
            >
              <View style={styles.avatarMini}>
                <Text style={styles.avatarTextMini}>{user?.name?.[0] || 'U'}</Text>
                {requestCount > 0 && <View style={styles.notificationDot} />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Dashboard Title - Dictionary Style */}
          <View style={styles.dictionaryHeader}>
            <View style={styles.wordRow}>
              <Text style={styles.headerWord}>{viewMode === 'feed' ? 'feed' : 'rankings'}</Text>
            </View>
            <Text style={styles.headerPart}>noun • <Text style={styles.subheading}>{viewMode === 'feed' ? 'Trail feed' : 'My personal list'}</Text></Text>
            {viewMode === 'feed' && (
              <Text style={styles.headerDefinition}>
                a real-time stream of trail activities and rankings from your mountain circle.
              </Text>
            )}
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
                style={[styles.searchInput, { outlineStyle: 'none' } as any]}
                placeholder="search trails..."
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                selectionColor={Colors.primary}
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

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((result) => (
                <TouchableOpacity
                  key={result.id}
                  style={styles.searchResultItem}
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    router.push(`/route/${result.id}`);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{result.name}</Text>
                    <Text style={styles.resultRating}>{(result.rating || 0).toFixed(2)} rating</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={Colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          {/* Content View */}
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : viewMode === 'feed' ? (
            activities.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No matched trails yet.</Text>
                <Text style={styles.emptySub}>Sync your Strava activities in Settings.</Text>
              </View>
            ) : (
              activities.map((item) => <ActivityCard key={item.id} item={item} />)
            )
          ) : (
            userRankings.length === 0 && unmatchedActivities.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No hikes found.</Text>
                <Text style={styles.emptySub}>
                  Sync your activities in Settings to start building your mountain circle.
                </Text>
              </View>
            ) : (
              <>
                {unmatchedActivities.length > 0 && (
                  <View style={styles.stagingAreaHeader}>
                    <Text style={styles.stagingAreaTitle}>staging area</Text>
                    <Text style={styles.stagingAreaSub}>Promote these activities to trails to start ranking.</Text>
                  </View>
                )}
                {unmatchedActivities.map((item) => <ActivityCard key={item.id} item={item} isRankView={true} isStaging={true} />)}

                {(userRankings.length > 0 || unmatchedActivities.length > 0) && <View style={styles.divider} />}

                {userRankings.length > 0 && (
                  <View style={styles.stagingAreaHeader}>
                    <Text style={styles.stagingAreaTitle}>ranked trails</Text>
                  </View>
                )}

                {!showScores && userRankings.some(r => r.is_ranked) && (
                  <View style={styles.calibrationInfo}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                    <Text style={styles.calibrationInfoText}>
                      Scoring is hidden until you rank at least 5 hikes.
                    </Text>
                  </View>
                )}
                {userRankings.map((item) => <ActivityCard key={item.id} item={item} isRankView={true} />)}
              </>
            )
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Match Trail Modal */}
      <Modal
        visible={isMatchModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsMatchModalVisible(false)}
      >
        <View style={styles.matchModalOverlay}>
          <View style={styles.matchModalContent}>
            <View style={styles.matchModalHeader}>
              <Text style={styles.matchModalTitle}>promote to trail</Text>
              <TouchableOpacity onPress={() => setIsMatchModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.matchModalSub}>Search for the trail you hiked:</Text>

            <View style={styles.matchSearchInputWrapper}>
              <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={[styles.matchSearchInput, { outlineStyle: 'none' } as any]}
                placeholder="search trail database..."
                placeholderTextColor={Colors.textSecondary}
                value={matchSearchQuery}
                onChangeText={handleMatchSearch}
                autoFocus={true}
                selectionColor={Colors.primary}
              />
              {isMatchSearching && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>

            <ScrollView style={styles.matchSearchResultsList}>
              {matchSearchResults.map((result) => (
                <TouchableOpacity
                  key={result.id}
                  style={styles.matchResultItem}
                  onPress={() => promoteActivity(result.id)}
                  disabled={isPromoting}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.matchResultName}>{result.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                </TouchableOpacity>
              ))}
              {matchSearchQuery.length > 2 && matchSearchResults.length === 0 && !isMatchSearching && (
                <Text style={styles.noResultsText}>No trails found matching "{matchSearchQuery}"</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                <Text style={styles.profilePart}>hiker • <Text style={styles.handleSub}>@{user?.username}</Text></Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => {
                  setShowProfile(false);
                  router.push('/following');
                }}
              >
                <Text style={styles.statValue}>{followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => {
                  setShowProfile(false);
                  router.push('/followers');
                }}
              >
                <Text style={styles.statValue}>{followersCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => {
                  setShowProfile(false);
                  router.push('/requests');
                }}
              >
                <Text style={styles.statValue}>{requestCount}/{sentCount}</Text>
                <Text style={styles.statLabel}>Requests</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.menuList}>
              {user?.isAdmin && (
                <View style={styles.devPortal}>
                  <Text style={styles.devTitle}>developer portal</Text>
                  <View style={styles.mockInputRow}>
                    <TextInput
                      style={[styles.mockInput, { outlineStyle: 'none' } as any]}
                      placeholder="Mock Hiker Name..."
                      value={mockName}
                      onChangeText={setMockName}
                      placeholderTextColor={Colors.textSecondary}
                    />
                    <TouchableOpacity style={styles.mockButton} onPress={handleMockLogin}>
                      <Ionicons name="swap-horizontal" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
                  router.push('/find_friends');
                }}
              >
                <Ionicons name="people-outline" size={22} color={Colors.primary} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>find hikers</Text>
                  <Text style={styles.menuItemSub}>Grow your community</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.border} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowProfile(false);
                  router.push('/settings');
                }}
              >
                <Ionicons name="settings-outline" size={22} color={Colors.primary} />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>settings</Text>
                  <Text style={styles.menuItemSub}>Sync & Preferences</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  logoTouch: { padding: 4 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  profileTrigger: { padding: 4 },
  avatarMini: { width: 32, height: 32, borderRadius: 4, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatarTextMini: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  scrollContent: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 },
  dictionaryHeader: { marginBottom: 20 },
  wordRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  headerWord: { fontSize: 48, fontWeight: '300', color: Colors.text, letterSpacing: -1 },
  headerPart: { fontSize: 14, color: Colors.primary, fontStyle: 'italic', marginTop: 4 },
  subheading: { color: Colors.textSecondary, fontWeight: '600' },
  headerDefinition: { fontSize: 16, color: Colors.textSecondary, marginTop: 12, lineHeight: 24, fontWeight: '300' },
  viewSwitcher: { flexDirection: 'row', marginBottom: 24, backgroundColor: Colors.surfaceSecondary, padding: 4, borderWidth: 1, borderColor: Colors.border },
  switchTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  switchTabActive: { backgroundColor: Colors.background, elevation: 2 },
  switchText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  switchTextActive: { color: Colors.text, fontWeight: '700' },
  searchAndFilter: { flexDirection: 'row', gap: 12, marginBottom: 12, zIndex: 10 },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '300', outlineStyle: 'none', borderWidth: 0 } as any,
  filterButton: { width: 44, height: 44, backgroundColor: Colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  filterButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filtersDrawer: { marginBottom: 12 },
  filterChips: { gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border },
  chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '300' },
  searchResults: { position: 'absolute', top: 110, left: 24, right: 24, backgroundColor: Colors.surface, zIndex: 100, borderWidth: 1, borderColor: Colors.border, elevation: 5 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  resultName: { fontSize: 16, color: Colors.text, fontWeight: '600' },
  resultRating: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12, opacity: 0.5 },

  // Shared Card Styles
  activityCard: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    backgroundColor: Colors.surface
  },
  unrankedCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  trailTitleRow: { flex: 1 },
  trailNameText: { fontSize: 20, fontWeight: '300', color: Colors.text, letterSpacing: -0.5 },
  ratingBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center'
  },
  ratingValueText: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  ratingLabelText: { color: Colors.primary, fontSize: 8, fontWeight: '600', textTransform: 'uppercase' },
  cardMetadata: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  userName: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  dotSeparator: { fontSize: 12, color: Colors.textSecondary, marginHorizontal: 4 },
  dateText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '300' },
  pendingBadge: { backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border },
  pendingText: { fontSize: 8, color: Colors.textSecondary, fontWeight: '800', textTransform: 'uppercase' },
  activityNotes: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: '300'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border
  },
  metricsGroup: { flexDirection: 'row', gap: 16 },
  footerMetric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '300' },
  socialGroup: { flexDirection: 'row', gap: 12 },
  socialItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  socialCount: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  rankNowAction: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  rankNowActionText: { color: 'white', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  promoteAction: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  stagingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  ignoreAction: {
    padding: 6,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stagingCard: {
    borderStyle: 'dashed',
    backgroundColor: Colors.surfaceSecondary,
  },
  stagingBadge: { backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  stagingBadgeText: { fontSize: 8, color: 'white', fontWeight: '800', textTransform: 'uppercase' },
  stagingAreaHeader: { marginBottom: 12, marginTop: 8 },
  stagingAreaTitle: { fontSize: 24, fontWeight: '300', color: Colors.text, letterSpacing: -0.5 },
  stagingAreaSub: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 2 },

  matchModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  matchModalContent: { backgroundColor: Colors.background, width: '100%', maxWidth: 400, padding: 24, borderWidth: 1, borderColor: Colors.border },
  matchModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  matchModalTitle: { fontSize: 28, fontWeight: '300', color: Colors.text, letterSpacing: -1 },
  matchModalSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20, fontStyle: 'italic' },
  matchSearchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: Colors.border, gap: 8, marginBottom: 16 },
  matchSearchInput: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: '300', outlineStyle: 'none', borderWidth: 0 } as any,
  matchSearchResultsList: { maxHeight: 300 },
  matchResultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  matchResultName: { fontSize: 16, color: Colors.text, fontWeight: '400' },
  noResultsText: { textAlign: 'center', color: Colors.textSecondary, marginTop: 20, fontStyle: 'italic' },

  calibrationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20
  },
  calibrationInfoText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '400' },

  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '300', color: Colors.text, textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 10, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: height * 0.7 },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 30 },
  avatarLarge: { width: 64, height: 64, borderRadius: 8, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  avatarTextLarge: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  modalWordRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  profileName: { fontSize: 24, fontWeight: '800', color: Colors.text },
  profilePart: { fontSize: 12, color: Colors.primary, fontStyle: 'italic' },
  handleSub: { color: Colors.textSecondary, fontStyle: 'normal', fontWeight: '400' },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surfaceSecondary, padding: 16, justifyContent: 'space-around', marginBottom: 30, borderWidth: 1, borderColor: Colors.border },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  menuList: { gap: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: Colors.surfaceSecondary, borderRadius: 0, gap: 16 },
  menuItemContent: { flex: 1 },
  menuItemTitle: { fontSize: 16, fontWeight: '300', color: Colors.text },
  menuItemSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  devPortal: {
    padding: 16,
    backgroundColor: 'rgba(67, 160, 71, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(67, 160, 71, 0.2)',
    marginBottom: 16,
  },
  devTitle: {
    fontSize: 10,
    fontFamily: 'Outfit-Bold',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  mockInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mockInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    color: Colors.text,
    fontSize: 14,
    fontFamily: 'Outfit-Light',
  },
  mockButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
