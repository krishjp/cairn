import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function FindFriendsScreen() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setResults(data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFollow = async (userId: string, currentStatus: string | null, isPrivate: boolean) => {
    try {
      if (currentStatus === 'accepted') {
        // Unfollow
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/unfollow/${userId}`, {
          method: 'DELETE',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          setResults(prev => prev.map(u => u.id === userId ? { ...u, follow_status: null } : u));
        }
      } else if (currentStatus === 'pending') {
        // Cancel request
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/requests/cancel/${userId}`, {
          method: 'DELETE',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          setResults(prev => prev.map(u => u.id === userId ? { ...u, follow_status: null } : u));
        }
      } else {
        // Follow or Request
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/follow/${userId}`, {
          method: 'POST',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setResults(prev => prev.map(u => u.id === userId ? { ...u, follow_status: data.status } : u));
          Alert.alert(isPrivate ? "Request Sent" : "Following", isPrivate ? "Follow request sent to private account." : `You are now following this hiker.`);
        }
      }
    } catch (error) {
      console.error('Follow action failed:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>find hikers</Text>
          <Text style={styles.headerSubtitle}>noun • <Text style={styles.italic}>Grow your circle.</Text></Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { outlineStyle: 'none' } as any]}
            placeholder="Search by name or @username..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={Colors.textSecondary}
            autoFocus
          />
          {isSearching && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {results.length === 0 && searchQuery.length >= 2 && !isSearching && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hikers found matching "{searchQuery}"</Text>
          </View>
        )}

        {results.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.display_name[0]}</Text>
              </View>
              <View>
                <Text style={styles.userName}>{user.display_name}</Text>
                <Text style={styles.userHandle}>@{user.username}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.actionButton,
                user.follow_status === 'accepted' && styles.followingButton,
                user.follow_status === 'pending' && styles.pendingButton
              ]}
              onPress={() => toggleFollow(user.id, user.follow_status, user.is_private)}
            >
              <Text style={[
                styles.actionButtonText,
                (user.follow_status === 'accepted' || user.follow_status === 'pending') && styles.followingButtonText
              ]}>
                {user.follow_status === 'accepted' ? 'Following' : 
                 user.follow_status === 'pending' ? 'Requested' : 
                 user.is_private ? 'Request' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 24, paddingTop: 60, flexDirection: 'row', alignItems: 'center', gap: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 32, fontWeight: '300', color: Colors.text, letterSpacing: -1 },
  headerSubtitle: { fontSize: 14, color: Colors.primary, marginTop: 2 },
  italic: { fontStyle: 'italic', color: Colors.textSecondary },
  searchContainer: { paddingHorizontal: 24, marginBottom: 20 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: '300', outlineWidth: 0 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  userCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 4, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  userName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  userHandle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  actionButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.primary, borderWidth: 1, borderColor: Colors.primary },
  followingButton: { backgroundColor: 'transparent', borderColor: Colors.border },
  pendingButton: { backgroundColor: 'transparent', borderColor: Colors.primary },
  actionButtonText: { color: 'white', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  followingButtonText: { color: Colors.textSecondary },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center' },
});
