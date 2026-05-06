import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { CairnLogo } from '../../components/CairnLogo';

const { width } = Dimensions.get('window');

export default function Ranking() {
  const { user } = useAuth();
  const { fixed_id } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (user?.id) {
      fetchNextPair();
    }
  }, [user, fixed_id]);

  const fetchNextPair = async () => {
    setIsLoading(true);
    fadeAnim.setValue(0);
    try {
      const baseUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/v1/ranking/next-pair?user_id=${user?.id}`;
      const url = fixed_id ? `${baseUrl}&fixed_route_id=${fixed_id}` : baseUrl;
      
      const response = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      
      if (response.status === 404) {
        setData(null);
      } else {
        const result = await response.json();
        setData(result);
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

  const handleVote = async (winnerId: number, loserId: number) => {
    if (!user?.id) return;
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/ranking/vote?user_id=${user.id}&winner_id=${winnerId}&loser_id=${loserId}`,
        { 
          method: 'POST',
          headers: { 'ngrok-skip-browser-warning': 'true' }
        }
      );
      fetchNextPair();
    } catch (err) {
      console.error("Vote failed:", err);
    }
  };

  const handleInitializeFirst = async (routeId: number) => {
    if (!user?.id) return;
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/ranking/initialize-first?user_id=${user.id}&route_id=${routeId}`,
        { 
          method: 'POST',
          headers: { 'ngrok-skip-browser-warning': 'true' }
        }
      );
      router.back(); // Done with first hike
    } catch (err) {
      console.error("Initialization failed:", err);
    }
  };

  if (isLoading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!data) {
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
            This hike has been sufficiently calibrated against your other treks.
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Return to Dashboard</Text>
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
        <Text style={styles.headerPart}>verb • <Text style={styles.subheading}>{data.status === 'FIRST_HIKE' ? 'baseline initialization' : 'comparing experiences'}</Text></Text>
        <Text style={styles.headerDefinition}>
          {data.status === 'FIRST_HIKE' 
            ? "Since this is your first ranked hike, it will be set as your initial 10/10 baseline."
            : `Ranking ${data.route_a.name} against your previously ranked treks.`}
        </Text>
      </View>

      <Animated.View style={[styles.pairContainer, { opacity: fadeAnim }]}>
        {data.status === 'FIRST_HIKE' ? (
          <View style={styles.firstHikeContainer}>
            <View style={[styles.choiceCard, styles.pinnedCard]}>
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
                <Text style={[styles.promptText, styles.pinnedPromptText]}>Initial 10/10 Baseline</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.baselineButton} 
              onPress={() => handleInitializeFirst(data.route_a.id)}
            >
              <Text style={styles.baselineButtonText}>Set as First Ranked Hike</Text>
              <Ionicons name="medal-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
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
  doneButtonText: { color: 'white', fontSize: 16, fontWeight: '600' }
});
