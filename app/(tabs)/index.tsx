// app/(tabs)/index.tsx - Updated Home Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import UserProfileHeader from '../../components/AuthHeader';
import apiService from '../../services/api';

interface GameZone {
  _id: string;
  name: string;
  description: string;
  pricePerHour: number;
  rating: number;
  totalReviews: number;
  images: string[];
  location: {
    address: string;
  };
}

export default function HomeScreen() {
  const [gameZones, setGameZones] = useState<GameZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGameZones();
  }, []);

  const loadGameZones = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading game zones...');
      
      const response = await apiService.getGameZones({
        page: 1,
        limit: 5, // Load first 5 for featured section
      });
      
      console.log('✅ Game zones loaded:', response.gamezones?.length || 0);
      setGameZones(response.gamezones || []);
    } catch (error) {
      console.error('❌ Error loading game zones:', error);
      // Don't show error for now, just keep empty state
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGameZones();
    setRefreshing(false);
  };

  const handleSeeAllGameZones = () => {
    router.push('/gamezone');
  };

  const handleGameZonePress = (gameZone: GameZone) => {
    router.push(`/gamezone/${gameZone._id}`);
  };

  const handleRetry = () => {
    loadGameZones();
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>🎮 GameZone</Text>
          <Text style={styles.subtitle}>
            Discover amazing gaming experiences near you
          </Text>
        </View>
      </View>

      {/* User Profile Section */}
      <View style={styles.content}>
        <UserProfileHeader style={styles.profileHeader} />

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {gameZones.length}+
            </Text>
            <Text style={styles.statLabel}>Gaming Zones</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>24/7</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>1000+</Text>
            <Text style={styles.statLabel}>Happy Gamers</Text>
          </View>
        </View>

        {/* Featured Gaming Zones Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Featured Gaming Zones</Text>
            <TouchableOpacity onPress={handleSeeAllGameZones}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Loading game zones...</Text>
            </View>
          ) : gameZones.length > 0 ? (
            <View style={styles.gameZonesList}>
              {gameZones.map((gameZone) => (
                <TouchableOpacity
                  key={gameZone._id}
                  style={styles.gameZoneCard}
                  onPress={() => handleGameZonePress(gameZone)}
                >
                  <View style={styles.gameZoneInfo}>
                    <Text style={styles.gameZoneName} numberOfLines={1}>
                      {gameZone.name}
                    </Text>
                    <Text style={styles.gameZoneDescription} numberOfLines={2}>
                      {gameZone.description}
                    </Text>
                    <View style={styles.gameZoneDetails}>
                      <Text style={styles.price}>
                        ${gameZone.pricePerHour}/hour
                      </Text>
                      <View style={styles.rating}>
                        <Text style={styles.ratingText}>
                          ⭐ {gameZone.rating.toFixed(1)}
                        </Text>
                        <Text style={styles.reviewsText}>
                          ({gameZone.totalReviews})
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.location} numberOfLines={1}>
                      📍 {gameZone.location.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No gaming zones available at the moment
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/gamezone')}
            >
              <Text style={styles.actionIcon}>🎮</Text>
              <Text style={styles.actionTitle}>Browse Zones</Text>
              <Text style={styles.actionDescription}>
                Find gaming zones near you
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/booking')}
            >
              <Text style={styles.actionIcon}>📅</Text>
              <Text style={styles.actionTitle}>My Bookings</Text>
              <Text style={styles.actionDescription}>
                View your reservations
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  gameZonesList: {
    gap: 12,
  },
  gameZoneCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gameZoneInfo: {
    flex: 1,
  },
  gameZoneName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  gameZoneDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  gameZoneDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#f59e0b',
    marginRight: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: '#6b7280',
  },
  location: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});