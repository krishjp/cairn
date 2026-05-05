import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CairnLogo } from '../../components/CairnLogo';

export default function Dashboard() {
  const { user, signOut } = useAuth();

  const mockActivities = [
    { id: '1', user: 'Krish Patel', trail: 'Yosemite: Clouds Rest', date: '2h ago', rating: 1482 },
    { id: '2', user: 'Sarah Jenkins', trail: 'Rainier: Skyline Trail', date: '5h ago', rating: 1420 },
    { id: '3', user: 'Alex Chen', trail: 'Zion: Angels Landing', date: 'Yesterday', rating: 1395 },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.surfaceSecondary, Colors.background]}
        style={styles.header}
      >
        <View style={styles.topRow}>
          <CairnLogo size={40} color={Colors.primary} />
          <TouchableOpacity onPress={signOut} style={styles.profileButton}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.name?.[0] || 'U'}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Explorer'}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions */}
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.syncButton}>
            <LinearGradient
              colors={[Colors.primary, '#2E7D32']}
              style={styles.syncGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="sync" size={24} color="white" />
              <Text style={styles.syncButtonText}>Sync Activities</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Feed Section */}
        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>Trail Feed</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {mockActivities.map((item) => (
          <View key={item.id} style={styles.activityCard}>
            <View style={styles.cardHeader}>
              <View style={styles.userRow}>
                <View style={styles.smallAvatar} />
                <View>
                  <Text style={styles.cardUser}>{item.user}</Text>
                  <Text style={styles.cardDate}>{item.date}</Text>
                </View>
              </View>
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
            </View>
            
            <View style={styles.cardContent}>
              <Text style={styles.cardTrail}>{item.trail}</Text>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{item.rating} elo</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <TouchableOpacity style={styles.footerAction}>
                <Ionicons name="heart-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.footerActionText}>Clap</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerAction}>
                <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.footerActionText}>Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileButton: {
    padding: 2,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  welcomeContainer: {
    marginTop: 10,
  },
  welcomeText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '400',
  },
  userName: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  actionGrid: {
    marginBottom: 30,
  },
  syncButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  syncGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  feedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  seeAll: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
  },
  cardUser: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  cardDate: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  cardContent: {
    marginBottom: 20,
  },
  cardTrail: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  ratingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(67, 160, 71, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(67, 160, 71, 0.2)',
  },
  ratingText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 15,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerActionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
