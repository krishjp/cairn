import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';

export default function FollowingScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [following, setFollowing] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFollowing = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/friends`,
        { 
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          } 
        }
      );
      const data = await response.json();
      if (data && data.following) {
        setFollowing(data.following);
      }
    } catch (err) {
      console.error("Failed to fetch following:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFollowing();
    }, [token])
  );

  const handleUnfollow = async (userId: string) => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/unfollow/${userId}`,
        { 
          method: 'POST',
          headers: { 
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}`
          } 
        }
      );
      if (response.ok) {
        setFollowing(prev => prev.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error("Unfollow failed:", err);
    }
  };

  const filteredFollowing = following.filter(u => 
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerWord}>following</Text>
          <Text style={styles.headerPart}>noun • <Text style={styles.subheading}>hikers you track</Text></Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { outlineStyle: 'none' } as any]}
            placeholder="search following..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            selectionColor={Colors.primary}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : filteredFollowing.length === 0 ? (
            <Text style={styles.emptyText}>
              {searchQuery ? 'No hikers match your search.' : "You aren't following anyone yet."}
            </Text>
          ) : (
            <View style={styles.card}>
              {filteredFollowing.map((user, index) => (
                <View key={user.id} style={[styles.userItem, index === filteredFollowing.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{user.display_name[0]}</Text>
                    </View>
                    <View>
                      <Text style={styles.userName}>{user.display_name}</Text>
                      {user.username && <Text style={styles.userHandle}>@{user.username}</Text>}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleUnfollow(user.id)}>
                    <Text style={styles.unfollowText}>Unfollow</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 48,
    paddingTop: 30,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleWrapper: {
    marginBottom: 12,
  },
  headerWord: {
    fontSize: 48,
    fontFamily: 'Outfit-Light',
    color: Colors.text,
    letterSpacing: -1,
    fontWeight: '300' as any,
  },
  headerPart: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: Colors.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  subheading: {
    fontFamily: 'Outfit-Bold',
    color: Colors.textSecondary,
    fontStyle: 'normal',
  },
  content: {
    flex: 1,
    paddingHorizontal: 48,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontFamily: 'Outfit-Light',
    fontWeight: '300' as any,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 4,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: {
    color: Colors.text,
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Outfit-Light',
    color: Colors.text,
    fontWeight: '300' as any,
  },
  userHandle: {
    fontSize: 12,
    fontFamily: 'Outfit-Light',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  unfollowText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    textDecorationLine: 'underline',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontFamily: 'Outfit-Light',
    fontSize: 14,
    opacity: 0.6,
    fontStyle: 'italic',
    marginTop: 20,
  }
});
