import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { CairnLogo } from '../../components/CairnLogo';

const { width } = Dimensions.get('window');

export default function Ranking() {
  const { user, token } = useAuth();
  const { fixed_id } = useLocalSearchParams();
  const [step, setStep] = useState<'loading' | 'bucket' | 'compare' | 'complete'>('loading');
  const [bucketHike, setBucketHike] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (user?.id) {
      checkInitialization();
    }
  }, [user, fixed_id]);

  const checkInitialization = async () => {
    if (!fixed_id) {
      fetchNextPair();
      return;
    }

    try {
      // Check if this specific hike is already ranked
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
      const isRanked = data.routes.find((r: any) => r.id === parseInt(fixed_id as string))?.is_ranked;

      if (!isRanked) {
        // We need to pick a bucket first
        // Fetch the route details
        const routeResp = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/v1/ranking/next-pair?fixed_route_id=${fixed_id}`,
          { 
            headers: { 
              'ngrok-skip-browser-warning': 'true',
              'Authorization': `Bearer ${token}`
            } 
          }
        );
        const routeData = await routeResp.json();
        setBucketHike(routeData.route_a);
        setStep('bucket');
      } else {
        fetchNextPair();
      }
    } catch (err) {
      console.error("Check init failed:", err);
      fetchNextPair();
    }
  };

  const fetchNextPair = async () => {
    setIsLoading(true);
    fadeAnim.setValue(0);
    try {
      const baseUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/v1/ranking/next-pair`;
      const url = fixed_id ? `${baseUrl}?fixed_route_id=${fixed_id}` : baseUrl;
      
      const response = await fetch(url, { 
        headers: { 
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        } 
      });
      
      if (response.status === 404) {
        setStep('complete');
        setData(null);
      } else {
        const result = await response.json();
        setData(result);
        setStep('compare');
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }
    } catch (err) {
      console.error("Failed to fetch pair:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeWithBucket = async (bucket: number) => {
    if (!user?.id || !fixed_id) return;
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/ranking/initialize-with-bucket?route_id=${fixed_id}&bucket=${bucket}`,
        { 
          method: 'POST',
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      // Now that it's initialized, start comparing
      fetchNextPair();
    } catch (err) {
      console.error("Bucket init failed:", err);
    }
  };

  const handleVote = async (winnerId: number, loserId: number) => {
    if (!user?.id) return;
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/ranking/vote?winner_id=${winnerId}&loser_id=${loserId}`,
        { 
          method: 'POST',
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      fetchNextPair();
    } catch (err) {
      console.error("Vote failed:", err);
    }
  };


  if (step === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (step === 'complete' || (step === 'compare' && (!data || data.status === 'FIRST_HIKE'))) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-circle-outline" size={64} color={Colors.primary} />
          <Text style={styles.emptyTitle}>calibration complete</Text>
          <Text style={styles.emptySub}>
            {data?.status === 'FIRST_HIKE' 
              ? "This was your first ranked hike! Once you've promoted more activities, you'll be able to rank them against each other."
              : "This hike has been sufficiently calibrated against your other treks."}
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'bucket') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close-outline" size={30} color={Colors.text} />
          </TouchableOpacity>
          <CairnLogo size={24} color={Colors.primary} />
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.header}>
          <Text style={styles.headerWord}>initial feeling</Text>
          <Text style={styles.headerPart}>noun • <Text style={styles.subheading}>first impression</Text></Text>
          <Text style={styles.headerDefinition}>
            How would you broadly categorize your experience on <Text style={{fontWeight: '700', color: Colors.text}}>{bucketHike?.name}</Text>?
          </Text>
        </View>

        <View style={styles.bucketContainer}>
          <TouchableOpacity style={styles.bucketCard} onPress={() => handleInitializeWithBucket(3)}>
            <View style={styles.bucketIcon}>
              <Ionicons name="triangle" size={32} color={Colors.primary} />
            </View>
            <View style={styles.bucketTextContainer}>
              <Text style={styles.bucketTitle}>Peak</Text>
              <Text style={styles.bucketSub}>"I loved it" • 7.0 - 10.0</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.border} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.bucketCard} onPress={() => handleInitializeWithBucket(2)}>
            <View style={styles.bucketIcon}>
              <Ionicons name="remove" size={32} color={Colors.primary} />
            </View>
            <View style={styles.bucketTextContainer}>
              <Text style={styles.bucketTitle}>another hike</Text>
              <Text style={styles.bucketSub}>"I liked it" • 4.0 - 6.9</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.border} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.bucketCard} onPress={() => handleInitializeWithBucket(1)}>
            <View style={styles.bucketIcon}>
              <Ionicons name="ellipse-outline" size={32} color={Colors.primary} />
            </View>
            <View style={styles.bucketTextContainer}>
              <Text style={styles.bucketTitle}>a hill</Text>
              <Text style={styles.bucketSub}>"I didn't like it" • 0.0 - 3.9</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.border} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close-outline" size={30} color={Colors.text} />
        </TouchableOpacity>
        <CairnLogo size={24} color={Colors.primary} />
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerWord}>calibration</Text>
        <Text style={styles.headerPart}>verb • <Text style={styles.subheading}>comparing experiences</Text></Text>
        <Text style={styles.headerDefinition}>
          {`Ranking ${data?.route_a?.name} against your previously ranked treks.`}
        </Text>
      </View>

      <Animated.View style={[styles.pairContainer, { opacity: fadeAnim }]}>
          <View style={styles.sideBySide}>
            <TouchableOpacity 
              style={[styles.choiceCard, styles.pinnedCard]} 
              onPress={() => handleVote(data.route_a.id, data.route_b.id)}
            >
              <View style={styles.cardContent}>
                <Text style={styles.trailName} numberOfLines={3}>{data.route_a.name}</Text>
                <Text style={styles.trailRegion}>{data.route_a.region || 'mountain region'}</Text>
                
                <View style={styles.metricsColumn}>
                  <View style={styles.metric}>
                    <Ionicons name="resize-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.metricText}>{(data.route_a.distance_meters / 1609.34).toFixed(1)} mi</Text>
                  </View>
                  <View style={styles.metric}>
                    <Ionicons name="trending-up-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.metricText}>{data.route_a.elevation_gain_meters} ft</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.selectPrompt, styles.pinnedPrompt]}>
                <Text style={[styles.promptText, styles.pinnedPromptText]}>{fixed_id ? 'Pinned Hike' : 'Select A'}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.vsBadgeFloating}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <TouchableOpacity 
              style={styles.choiceCard} 
              onPress={() => handleVote(data.route_b.id, data.route_a.id)}
            >
              <View style={styles.cardContent}>
                <Text style={styles.trailName} numberOfLines={3}>{data.route_b.name}</Text>
                <Text style={styles.trailRegion}>{data.route_b.region || 'mountain region'}</Text>
                
                <View style={styles.metricsColumn}>
                  <View style={styles.metric}>
                    <Ionicons name="resize-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.metricText}>{(data.route_b.distance_meters / 1609.34).toFixed(1)} mi</Text>
                  </View>
                  <View style={styles.metric}>
                    <Ionicons name="trending-up-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.metricText}>{data.route_b.elevation_gain_meters} ft</Text>
                  </View>
                </View>
              </View>
              <View style={styles.selectPrompt}>
                <Text style={styles.promptText}>Select B</Text>
              </View>
            </TouchableOpacity>
          </View>
      </Animated.View>

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.skipButton} onPress={fetchNextPair}>
          <Text style={styles.skipText}>I'm not sure / Skip this pair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  header: { paddingHorizontal: 24, marginBottom: 40 },
  headerWord: { fontSize: 40, fontWeight: '300', color: Colors.text, letterSpacing: -1 },
  headerPart: { fontSize: 14, color: Colors.primary, fontStyle: 'italic', marginTop: 4 },
  subheading: { color: Colors.textSecondary, fontStyle: 'normal', fontWeight: '600' },
  headerDefinition: { fontSize: 15, color: Colors.textSecondary, marginTop: 12, lineHeight: 22, fontWeight: '300' },
  pairContainer: { flex: 1, paddingHorizontal: 12, paddingBottom: 40 },
  sideBySide: { flex: 1, flexDirection: 'row', gap: 12 },
  firstHikeContainer: { flex: 1, alignItems: 'center' },
  choiceCard: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: Colors.border, 
    backgroundColor: Colors.surface,
    height: '100%',
    width: '100%'
  },
  pinnedCard: {
    borderColor: Colors.primary,
  },
  cardContent: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  trailName: { fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 8, height: 75 },
  trailRegion: { fontSize: 11, color: Colors.textSecondary, fontWeight: '300', fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  metricsColumn: { gap: 12, alignItems: 'center' },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '400' },
  selectPrompt: { 
    paddingVertical: 16, 
    borderTopWidth: 1, 
    borderTopColor: Colors.border, 
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary
  },
  pinnedPrompt: {
    backgroundColor: Colors.primary,
    borderTopColor: Colors.primary,
  },
  pinnedPromptText: {
    color: 'white',
  },
  promptText: { fontSize: 11, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  baselineButton: { 
    marginTop: 24, 
    backgroundColor: Colors.primary, 
    paddingHorizontal: 32, 
    paddingVertical: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  baselineButtonText: { color: 'white', fontSize: 16, fontWeight: '800', textTransform: 'uppercase' },
  vsBadgeFloating: { 
    position: 'absolute',
    left: '50%',
    top: '40%',
    marginLeft: -20,
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: Colors.border, 
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5
  },
  vsText: { fontSize: 10, fontWeight: '900', color: Colors.textSecondary },
  footerActions: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  skipButton: { padding: 12 },
  skipText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '300', textDecorationLine: 'underline' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 24, fontWeight: '300', color: Colors.text, marginTop: 24, marginBottom: 12 },
  emptySub: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, fontWeight: '300', marginBottom: 40 },
  doneButton: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 0 },
  doneButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  bucketContainer: { paddingHorizontal: 24, gap: 16 },
  bucketCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.surface, 
    borderWidth: 1, 
    borderColor: Colors.border, 
    padding: 20, 
    gap: 16 
  },
  bucketIcon: { width: 48, alignItems: 'center' },
  bucketTextContainer: { flex: 1 },
  bucketTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textTransform: 'lowercase' },
  bucketSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, fontWeight: '300' },
});
