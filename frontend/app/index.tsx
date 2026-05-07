import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Dimensions, SafeAreaView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { CairnLogo } from '../components/CairnLogo';
import { StravaLogo } from '../components/StravaLogo';
import { PoweredByStrava } from '../components/PoweredByStrava';

const { height } = Dimensions.get('window');

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [mockName, setMockName] = useState('');
  const { signIn, user, isLoading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  const segments = require('expo-router').useSegments();

  useEffect(() => {
    // Only redirect if we are on the landing page (segments empty)
    if (!isLoading && user && segments.length === 0) {
      router.replace('/(app)/dashboard');
    }
  }, [user, isLoading, segments]);

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
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Minimal Nav */}
          <View style={styles.navBar}>
            <CairnLogo size={32} color={Colors.primary} />
            <TouchableOpacity onPress={() => router.push('/auth/strava')}>
              <Text style={styles.loginText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Section - Dictionary Style */}
          <View style={styles.heroSection}>
            <View style={styles.heroWordRow}>
              <Text style={styles.heroWord}>cairn</Text>
            </View>
            <Text style={styles.heroPart}>noun • <Text style={styles.heroSubheading}>The social trail network.</Text></Text>
            <Text style={styles.heroDefinition}>
              a platform where mountain lovers track activities, challenge friends, and collectively rank the world's most iconic trails.
            </Text>
          </View>

          {/* Primary CTA */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.stravaButton}
              onPress={() => router.push('/auth/strava')}
            >
              <StravaLogo size={20} color={Colors.text} />
              <Text style={styles.stravaButtonText}>Begin with Strava</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Preview Section */}
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>trending</Text>
              <Text style={styles.previewSub}>noun • <Text style={styles.subheading}>Global Peaks</Text></Text>
            </View>

            <View style={styles.previewList}>
              <PreviewItem rank={1} name="clouds rest" rating={8.42} />
              <PreviewItem rank={2} name="skyline trail" rating={7.95} />
              <PreviewItem rank={3} name="angels landing" rating={7.81} />
            </View>
          </View>

          <View style={styles.footer}>
            <PoweredByStrava />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

function PreviewItem({ rank, name, rating }: { rank: number; name: string; rating: number }) {
  return (
    <View style={styles.previewItem}>
      <View style={styles.previewItemInfo}>
        <Text style={styles.rankText}>{rank}.</Text>
        <View>
          <Text style={styles.trailName}>{name}</Text>
        </View>
      </View>
      <View style={styles.ratingBadge}>
        <Text style={styles.ratingText}>{rating.toFixed(2)} rating</Text>
      </View>
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
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  loginText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
  },
  heroWordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  heroWord: {
    fontSize: 56,
    fontWeight: '300',
    color: Colors.text,
    letterSpacing: -2,
  },
  heroPart: {
    fontSize: 15,
    color: Colors.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  heroSubheading: {
    color: Colors.textSecondary,
    fontStyle: 'normal',
    fontWeight: '600',
  },
  heroDefinition: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 16,
    lineHeight: 28,
    fontWeight: '300',
  },
  actionContainer: {
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 40,
  },
  stravaButton: {
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    height: 64,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  stravaButtonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 24,
    marginBottom: 40,
  },
  previewSection: {
    paddingHorizontal: 24,
  },
  previewHeader: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 32,
    fontWeight: '300',
    color: Colors.text,
    letterSpacing: -1,
  },
  previewSub: {
    fontSize: 14,
    color: Colors.primary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  subheading: {
    color: Colors.textSecondary,
    fontStyle: 'normal',
    fontWeight: '600',
  },
  previewList: {
    gap: 16,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  trailName: {
    fontSize: 18,
    fontWeight: '300',
    color: Colors.text,
  },
  ratingBadge: {
    backgroundColor: 'rgba(67, 160, 71, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(67, 160, 71, 0.2)',
  },
  ratingText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  footer: {
    marginTop: 60,
    paddingBottom: 40,
  },
});
