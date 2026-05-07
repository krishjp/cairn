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

export default function RequestsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // Incoming
      const inRes = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/requests`,
        { headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${token}` } }
      );
      const inData = await inRes.json();
      setIncoming(Array.isArray(inData) ? inData : []);

      // Outgoing (via friends endpoint)
      const outRes = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/friends`,
        { headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${token}` } }
      );
      const outData = await outRes.json();
      setOutgoing(outData.sent || []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [token])
  );

  const handleApprove = async (followerId: string) => {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/requests/${followerId}/approve`,
        { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) setIncoming(prev => prev.filter(r => r.follower_id !== followerId));
    } catch (err) { console.error(err); }
  };

  const handleReject = async (followerId: string) => {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/requests/${followerId}/reject`,
        { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) setIncoming(prev => prev.filter(r => r.follower_id !== followerId));
    } catch (err) { console.error(err); }
  };

  const handleCancelOutgoing = async (userId: string) => {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/users/unfollow/${userId}`,
        { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true', 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) setOutgoing(prev => prev.filter(u => u.id !== userId));
    } catch (err) { console.error(err); }
  };

  const filteredIncoming = incoming.filter(u => 
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredOutgoing = outgoing.filter(u => 
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
          <Text style={styles.headerWord}>requests</Text>
          <Text style={styles.headerPart}>noun • <Text style={styles.subheading}>pending connections</Text></Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { outlineStyle: 'none' } as any]}
            placeholder="search requests..."
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
          ) : (
            <>
              {/* Incoming Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Incoming Requests</Text>
                {filteredIncoming.length === 0 ? (
                  <Text style={styles.emptyText}>No incoming requests.</Text>
                ) : (
                  <View style={styles.card}>
                    {filteredIncoming.map((req, index) => (
                      <View key={req.follower_id} style={[styles.userItem, index === filteredIncoming.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={styles.userInfo}>
                          <View style={styles.avatar}><Text style={styles.avatarText}>{req.display_name[0]}</Text></View>
                          <View>
                            <Text style={styles.userName}>{req.display_name}</Text>
                            {req.username && <Text style={styles.userHandle}>@{req.username}</Text>}
                          </View>
                        </View>
                        <View style={styles.requestActions}>
                          <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(req.follower_id)}>
                            <Ionicons name="checkmark" size={16} color="white" />
                            <Text style={styles.actionText}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(req.follower_id)}>
                            <Ionicons name="close" size={18} color={Colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Outgoing Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Outgoing Requests</Text>
                {filteredOutgoing.length === 0 ? (
                  <Text style={styles.emptyText}>No outgoing requests.</Text>
                ) : (
                  <View style={styles.card}>
                    {filteredOutgoing.map((user, index) => (
                      <View key={user.id} style={[styles.userItem, index === filteredOutgoing.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={styles.userInfo}>
                          <View style={styles.avatar}><Text style={styles.avatarText}>{user.display_name[0]}</Text></View>
                          <View>
                            <Text style={styles.userName}>{user.display_name}</Text>
                            {user.username && <Text style={styles.userHandle}>@{user.username}</Text>}
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => handleCancelOutgoing(user.id)} style={styles.cancelButton}>
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 48, paddingTop: 30, paddingBottom: 20 },
  backButton: { marginBottom: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitleWrapper: { marginBottom: 12 },
  headerWord: { fontSize: 48, fontFamily: 'Outfit-Light', color: Colors.text, letterSpacing: -1, fontWeight: '300' as any },
  headerPart: { fontSize: 14, fontFamily: 'Outfit-Regular', color: Colors.primary, fontStyle: 'italic', marginTop: 4 },
  subheading: { fontFamily: 'Outfit-Bold', color: Colors.textSecondary, fontStyle: 'normal' },
  content: { flex: 1, paddingHorizontal: 48 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 16, height: 44, borderWidth: 1, borderColor: Colors.border, gap: 12, marginBottom: 24 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15, fontFamily: 'Outfit-Light', fontWeight: '300' as any },
  scrollContent: { paddingBottom: 60 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 12, fontFamily: 'Outfit-Bold', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, opacity: 0.8 },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  userItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: Colors.border },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 42, height: 42, borderRadius: 4, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  avatarText: { color: Colors.text, fontFamily: 'Outfit-Bold', fontSize: 20 },
  userName: { fontSize: 16, fontFamily: 'Outfit-Light', color: Colors.text, fontWeight: '300' as any },
  userHandle: { fontSize: 11, fontFamily: 'Outfit-Light', color: Colors.textSecondary, marginTop: 1 },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  approveButton: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: 'white', fontSize: 10, fontFamily: 'Outfit-Bold', textTransform: 'uppercase' },
  rejectButton: { backgroundColor: Colors.surfaceSecondary, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelButton: { backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  cancelButtonText: { color: Colors.error, fontFamily: 'Outfit-Bold', fontSize: 10, textTransform: 'uppercase' },
  emptyText: { color: Colors.textSecondary, fontFamily: 'Outfit-Light', fontSize: 14, opacity: 0.6, fontStyle: 'italic', marginTop: 8 }
});
