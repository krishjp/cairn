import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { CairnLogo } from '../components/CairnLogo';
import { StravaLogo } from '../components/StravaLogo';
import { PoweredByStrava } from '../components/PoweredByStrava';

const { height } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Splash sequence
    const timer = setTimeout(() => {
      // Fade out splash
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
        // Fade in content
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      });
    }, 2500); // Show splash for 2.5s

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
        <View style={styles.splashContent}>
          <CairnLogo size={120} color={Colors.primary} />
          
          <View style={styles.definitionContainer}>
            <View style={styles.wordRow}>
              <Text style={styles.word}>cairn</Text>
              <Text style={styles.phonetic}>/keərn/</Text>
            </View>
            <Text style={styles.partOfSpeech}>noun</Text>
            <Text style={styles.definition}>
              a mound of rough stones built as a memorial or landmark, typically on a hilltop or skyline.
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: contentFadeAnim }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#1B2E1B', Colors.background]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <CairnLogo size={80} color={Colors.primary} />
          <Text style={styles.heroTitle}>Cairn</Text>
          <Text style={styles.heroSubtitle}>Your social trail companion.</Text>
        </LinearGradient>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.stravaButton}
            onPress={() => router.push('/auth/strava')}
          >
            <StravaLogo size={24} color={Colors.text} />
            <Text style={[styles.stravaButtonText, { marginLeft: 12 }]}>Begin with Strava</Text>
          </TouchableOpacity>
        </View>

        {/* Mock Leaderboard Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Global Peaks</Text>
            <Text style={styles.sectionSubtitle}>Highest ranked trails this week</Text>
          </View>
          <View style={styles.card}>
            <LeaderboardItem rank={1} name="Yosemite: Clouds Rest" score={1482} />
            <LeaderboardItem rank={2} name="Rainier: Skyline Trail" score={1420} />
            <LeaderboardItem rank={3} name="Zion: Angels Landing" score={1395} />
          </View>
        </View>

        {/* Footer */}
        <PoweredByStrava />
      </ScrollView>
    </Animated.View>
  );
}

function LeaderboardItem({ rank, name, score }: { rank: number; name: string; score: number }) {
  return (
    <View style={styles.leaderboardItem}>
      <Text style={styles.rankText}>{rank}</Text>
      <Text style={styles.trailName}>{name}</Text>
      <View style={styles.scoreBadge}>
        <Text style={styles.scoreText}>{score} elo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
    width: '80%',
  },
  definitionContainer: {
    marginTop: 40,
    width: '100%',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  word: {
    fontSize: 42,
    fontWeight: '300',
    color: Colors.text,
    letterSpacing: -1,
  },
  phonetic: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginLeft: 12,
    fontWeight: '300',
  },
  partOfSpeech: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 8,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  definition: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
    lineHeight: 26,
    fontWeight: '300',
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    padding: 40,
    paddingTop: 80,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.text,
    marginTop: 15,
    letterSpacing: -2,
  },
  heroSubtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
    fontWeight: '300',
  },
  actionContainer: {
    paddingHorizontal: 24,
    marginBottom: 50,
  },
  stravaButton: {
    backgroundColor: Colors.surfaceSecondary,
    flexDirection: 'row',
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stravaButtonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  rankText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.secondary,
    width: 40,
  },
  trailName: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  scoreBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
});
