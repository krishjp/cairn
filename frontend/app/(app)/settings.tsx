import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Settings() {
  const { user, token, signOut, signIn } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!user?.id) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/strava/sync`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert("Sync Complete", `Successfully synced ${data.synced} new activities.`);
      } else {
        throw new Error(data.detail || "Failed to sync");
      }
    } catch (error: any) {
      Alert.alert("Sync Failed", error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const [ignoredActivities, setIgnoredActivities] = useState<any[]>([]);
  const [isLoadingIgnored, setIsLoadingIgnored] = useState(false);

  React.useEffect(() => {
    fetchIgnored();
  }, []);

  const fetchIgnored = async () => {
    if (!user?.id) return;
    setIsLoadingIgnored(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/strava/ignored`, {
        headers: { 
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setIgnoredActivities(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingIgnored(false);
    }
  };

  const handleRestore = async (activityId: string) => {
    try {
      await fetch(`${API_URL}/api/v1/strava/restore?activity_id=${activityId}`, {
        method: 'POST',
        headers: { 
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        }
      });
      fetchIgnored(); // Refresh list
      Alert.alert("Restored", "Activity has been moved back to your staging area.");
    } catch (e) {
      console.error(e);
    }
  };

  const [localIsPrivate, setLocalIsPrivate] = useState(user?.isPrivate);

  // Sync local state when global user state changes
  React.useEffect(() => {
    setLocalIsPrivate(user?.isPrivate);
  }, [user?.isPrivate]);

  const handleTogglePrivacy = async () => {
    const newValue = !localIsPrivate;
    setLocalIsPrivate(newValue); 
    
    try {
      const response = await fetch(`${API_URL}/api/v1/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_private: newValue })
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        signIn({
          id: updatedUser.id,
          name: updatedUser.display_name,
          username: updatedUser.username,
          isAdmin: updatedUser.is_admin,
          isPrivate: updatedUser.is_private,
          token: token 
        });
      } else {
        // Revert if failed
        setLocalIsPrivate(!newValue);
        Alert.alert("Error", "Failed to update privacy settings.");
      }
    } catch (error) {
      console.error('Failed to update privacy:', error);
      setLocalIsPrivate(!newValue);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: () => {
          signOut();
          router.replace('/');
        }}
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.item}>
            <Text style={styles.itemLabel}>User</Text>
            <Text style={styles.itemValue}>{user?.name || 'Explorer'}</Text>
          </View>
          <View style={styles.item}>
            <Text style={styles.itemLabel}>Handle</Text>
            <Text style={styles.itemValue}>@{user?.username}</Text>
          </View>
          <View style={styles.item}>
            <View>
              <Text style={styles.itemLabel}>Private Account</Text>
              <Text style={styles.itemSub}>Only approved followers can see your trails.</Text>
            </View>
            <TouchableOpacity 
              onPress={handleTogglePrivacy}
              style={[styles.toggle, localIsPrivate && styles.toggleActive]}
            >
              <View style={[styles.toggleKnob, localIsPrivate && styles.toggleKnobActive]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integrations</Text>
          <TouchableOpacity 
            style={styles.syncCard} 
            onPress={handleSync}
            disabled={isSyncing}
          >
            <View style={styles.syncLeft}>
              <View style={styles.stravaIcon}>
                <Ionicons name="flash" size={20} color="white" />
              </View>
              <View>
                <Text style={styles.syncTitle}>Strava Sync</Text>
                <Text style={styles.syncSub}>Pull latest hiking activities</Text>
              </View>
            </View>
            {isSyncing ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hidden Activities</Text>
          {isLoadingIgnored ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : ignoredActivities.length === 0 ? (
            <Text style={styles.emptyText}>No hidden activities</Text>
          ) : (
            ignoredActivities.map(act => (
              <View key={act.id} style={styles.ignoredItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ignoredName}>{act.name}</Text>
                  <Text style={styles.ignoredDate}>{new Date(act.start_date).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRestore(act.id)} style={styles.restoreBtn}>
                  <Text style={styles.restoreBtnText}>Restore</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
    marginLeft: 5,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  itemValue: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  itemSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 24,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    backgroundColor: Colors.textSecondary,
  },
  toggleKnobActive: {
    backgroundColor: 'white',
    marginLeft: 26, // Manual shift instead of transform for stability in some RN environments
  },
  syncCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  stravaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FC6100',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  syncSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ignoredItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ignoredName: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  ignoredDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  restoreBtn: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  restoreBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuText: {
    fontSize: 16,
    color: Colors.text,
  },
  signOutButton: {
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF5252',
    alignItems: 'center',
  },
  signOutText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: '600',
  },
});
