// app/(tabs)/gamezones.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import type { GameZone } from '../../services/api';

export default function GameZonesScreen() {
  const [gameZones, setGameZones] = useState<GameZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredZones, setFilteredZones] = useState<GameZone[]>([]);

  useEffect(() => {
    loadGameZones();
  }, []);

  useEffect(() => {
    // Filter zones based on search query
    if (searchQuery.trim() === '') {
      setFilteredZones(gameZones);
    } else {
      const filtered = gameZones.filter(zone =>
        zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        zone.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        zone.location.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredZones(filtered);
    }
  }, [searchQuery, gameZones]);

  const loadGameZones = async () => {
    try {
      setLoading(true);
      console.log('🎮 Loading game zones...');
      
      // Use direct fetch since it works
      const response = await fetch('https://gamezone-production.up.railway.app/api/gamezones?limit=50');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔧 Direct fetch data:', data);
      console.log('🔧 Data keys:', Object.keys(data));
      
      // Try different ways to access the gamezones
      console.log('🔧 Method 1 - data.gamezones:', data.gamezones);
      console.log('🔧 Method 2 - data["gamezones"]:', data["gamezones"]);
      console.log('🔧 Method 3 - Object.values:', Object.values(data));
      
      // Use bracket notation instead of dot notation
      let zones = data["gamezones"] || Object.values(data)[0] || [];
      
      // If still empty, try to find the array in the object
      if (!Array.isArray(zones) || zones.length === 0) {
        for (const key in data) {
          if (Array.isArray(data[key]) && data[key].length > 0) {
            console.log('🔧 Found array at key:', key, data[key]);
            zones = data[key];
            break;
          }
        }
      }
      
      console.log('📱 Final zones:', zones);
      console.log('📱 Zones length:', zones.length);
      console.log('📱 Zones isArray:', Array.isArray(zones));
      
      if (zones.length > 0) {
        console.log('📱 First zone:', zones[0]);
        console.log('📱 First zone name:', zones[0]?.name);
      }
      
      setGameZones(zones);
      
    } catch (error) {
      console.error('❌ Load gamezones error:', error);
      Alert.alert(
        'Error',
        `Failed to load gaming zones: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGameZones();
    setRefreshing(false);
  };

  const handleZonePress = (zone: GameZone) => {
    router.push(`/gamezone/${zone._id}`);
  };

  const renderZoneCard = ({ item: zone }: { item: GameZone }) => (
    <TouchableOpacity
      style={styles.zoneCard}
      onPress={() => handleZonePress(zone)}
    >
      <Image
        source={{ 
          uri: zone.images[0] || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop&q=60'
        }}
        style={styles.zoneImage}
        resizeMode="cover"
      />
      <View style={styles.zoneInfo}>
        <View style={styles.zoneHeader}>
          <Text style={styles.zoneName} numberOfLines={1}>
            {zone.name}
          </Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text style={styles.rating}>{zone.rating}</Text>
          </View>
        </View>
        
        <Text style={styles.zoneDescription} numberOfLines={2}>
          {zone.description}
        </Text>
        
        <View style={styles.zoneLocation}>
          <Ionicons name="location-outline" size={14} color="#64748b" />
          <Text style={styles.locationText} numberOfLines={1}>
            {zone.location.address}
          </Text>
        </View>
        
        <View style={styles.zoneAmenities}>
          {zone.amenities.slice(0, 3).map((amenity, index) => (
            <View key={index} style={styles.amenityTag}>
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
          {zone.amenities.length > 3 && (
            <View style={styles.amenityTag}>
              <Text style={styles.amenityText}>+{zone.amenities.length - 3}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.zoneFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${zone.pricePerHour}</Text>
            <Text style={styles.priceUnit}>/hour</Text>
          </View>
          <View style={styles.capacityContainer}>
            <Ionicons name="people-outline" size={16} color="#64748b" />
            <Text style={styles.capacity}>{zone.capacity} people</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="game-controller-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No matching zones found' : 'No gaming zones available'}
      </Text>
      <Text style={styles.emptyDescription}>
        {searchQuery 
          ? 'Try adjusting your search terms'
          : 'Check back later for new gaming zones'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity style={styles.retryButton} onPress={loadGameZones}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading gaming zones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gaming Zones</Text>
        <Text style={styles.headerSubtitle}>
          {filteredZones.length} zone{filteredZones.length !== 1 ? 's' : ''} available
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search zones, amenities, or locations"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredZones}
        renderItem={renderZoneCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  listContainer: {
    padding: 16,
  },
  zoneCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  zoneImage: {
    width: '100%',
    height: 200,
  },
  zoneInfo: {
    padding: 16,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  zoneName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#d97706',
  },
  zoneDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  zoneLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    flex: 1,
    marginLeft: 4,
    fontSize: 13,
    color: '#64748b',
  },
  zoneAmenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  amenityTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  amenityText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  zoneFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  priceUnit: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 2,
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacity: {
    marginLeft: 4,
    fontSize: 14,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});