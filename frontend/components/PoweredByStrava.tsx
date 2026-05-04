import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StravaLogo } from './StravaLogo';
import { Colors } from '../constants/Colors';

export const PoweredByStrava = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>POWERED BY</Text>
      <View style={styles.logoRow}>
        <StravaLogo size={20} color={Colors.text} />
        <Text style={styles.stravaText}>STRAVA</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    opacity: 0.6,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stravaText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.text,
    marginLeft: 6,
    letterSpacing: -0.5,
  },
});
