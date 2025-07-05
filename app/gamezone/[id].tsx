// app/gamezone/[id].tsx - Improved Zone Details with better styling and images
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GameZone {
  _id: string;
  name: string;
  description: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: {
      coordinates: number[];
    };
  };
  amenities: string[];
  pricePerHour: number;
  images: string[];
  vendorId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  operatingHours: {
    start: string;
    end: string;
  };
  rating: number;
  totalReviews: number;
  capacity: number;
  isActive: boolean;
  gameTypes?: string[];
  equipment?: {
    pcs: number;
    consoles: number;
    vrHeadsets: number;
    arcadeMachines: number;
  };
  createdAt: string;
}

export default function ZoneDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [zone, setZone] = useState<GameZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      loadZoneDetails();
    } else {
      setError('No zone ID provided');
      setLoading(false);
    }
  }, [id]);

  const loadZoneDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading zone details for ID:', id);
      
      if (!id || typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new Error('Invalid zone ID format');
      }
      
      const response = await apiService.getGameZone(id);
      console.log('✅ Zone details loaded:', response);
      
      setZone(response);
    } catch (error) {
      console.error('❌ Error loading zone details:', error);
      
      let errorMessage = 'Failed to load zone details';
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('404')) {
          errorMessage = 'Gaming zone not found or has been removed';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('Invalid')) {
          errorMessage = 'Invalid zone ID';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    if (!zone) return;
    
    router.push({
      pathname: '/book-now',
      params: {
        zoneId: zone._id,
        zoneName: zone.name,
        pricePerHour: zone.pricePerHour.toString(),
      }
    });
  };

  const handleCallVendor = () => {
    if (!zone?.vendorId.phone) {
      Alert.alert('Contact Info', 'Phone number not available for this vendor');
      return;
    }
    
    Alert.alert(
      'Call Vendor',
      `Do you want to call ${zone.vendorId.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => {
          Alert.alert('Call', `Calling ${zone.vendorId.phone}...`);
        }}
      ]
    );
  };

  const handleDirections = () => {
    if (!zone) return;
    
    const { coordinates } = zone.location.coordinates;
    const [lng, lat] = coordinates;
    
    Alert.alert(
      'Get Directions',
      `Open maps to ${zone.location.address}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Maps', onPress: () => {
          console.log(`Opening maps to: ${lat}, ${lng}`);
          Alert.alert('Maps', `Opening directions to ${zone.location.address}`);
        }}
      ]
    );
  };

  const formatOperatingHours = (start: string, end: string) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color="#fbbf24"
        />
      );
    }
    return stars;
  };

  const getDefaultImage = () => {
    return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=400&fit=crop';
  };

  const handleImageChange = (direction: 'next' | 'prev') => {
    if (!zone?.images || zone.images.length === 0) return;
    
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % zone.images.length);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + zone.images.length) % zone.images.length);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading zone details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle" size={80} color="#ef4444" />
          <Text style={styles.errorTitle}>Zone Not Found</Text>
          <Text style={styles.errorText}>{error}</Text>
          
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadZoneDetails}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={() => router.back()}
            >
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!zone) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Ionicons name="help-circle" size={80} color="#6b7280" />
          <Text style={styles.errorTitle}>No Zone Data</Text>
          <Text style={styles.errorText}>Unable to load zone information</Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => router.back()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentImage = zone.images && zone.images.length > 0 
    ? zone.images[currentImageIndex] 
    : getDefaultImage();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Hero Image with Header */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={{ uri: currentImage }}
            style={styles.heroImage}
            imageStyle={styles.heroImageStyle}
          >
            <View style={styles.heroOverlay}>
              <View style={styles.heroHeader}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.favoriteButton}>
                  <Ionicons name="heart-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              {/* Image Navigation */}
              {zone.images && zone.images.length > 1 && (
                <View style={styles.imageNavigation}>
                  <TouchableOpacity
                    style={styles.imageNavButton}
                    onPress={() => handleImageChange('prev')}
                  >
                    <Ionicons name="chevron-back" size={24} color="white" />
                  </TouchableOpacity>
                  
                  <View style={styles.imageIndicators}>
                    {zone.images.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.imageIndicator,
                          index === currentImageIndex && styles.activeImageIndicator
                        ]}
                      />
                    ))}
                  </View>
                  
                  <TouchableOpacity
                    style={styles.imageNavButton}
                    onPress={() => handleImageChange('next')}
                  >
                    <Ionicons name="chevron-forward" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ImageBackground>
        </View>

        {/* Zone Information */}
        <View style={styles.infoContainer}>
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <View style={styles.priceTag}>
                <Text style={styles.price}>${zone.pricePerHour}</Text>
                <Text style={styles.priceLabel}>/hour</Text>
              </View>
            </View>

            <View style={styles.ratingSection}>
              <View style={styles.starsContainer}>
                {renderStars(zone.rating)}
              </View>
              <Text style={styles.ratingText}>
                {zone.rating.toFixed(1)} ({zone.totalReviews} reviews)
              </Text>
            </View>
          </View>

          <Text style={styles.description}>{zone.description}</Text>

          {/* Quick Info Cards */}
          <View style={styles.quickInfoContainer}>
            <View style={styles.quickInfoCard}>
              <Ionicons name="time" size={20} color="#6366f1" />
              <Text style={styles.quickInfoText}>
                {formatOperatingHours(zone.operatingHours.start, zone.operatingHours.end)}
              </Text>
            </View>
            
            <View style={styles.quickInfoCard}>
              <Ionicons name="people" size={20} color="#6366f1" />
              <Text style={styles.quickInfoText}>
                Up to {zone.capacity} people
              </Text>
            </View>
            
            <TouchableOpacity style={styles.quickInfoCard} onPress={handleDirections}>
              <Ionicons name="location" size={20} color="#6366f1" />
              <Text style={styles.quickInfoText}>
                {zone.location.city}, {zone.location.state}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amenities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎮 Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {zone.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityCard}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Game Types */}
          {zone.gameTypes && zone.gameTypes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 Game Types</Text>
              <View style={styles.gameTypesContainer}>
                {zone.gameTypes.map((type, index) => (
                  <View key={index} style={styles.gameTypeChip}>
                    <Text style={styles.gameTypeText}>{type}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Equipment */}
          {zone.equipment && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💻 Equipment</Text>
              <View style={styles.equipmentGrid}>
                {zone.equipment.pcs > 0 && (
                  <View style={styles.equipmentCard}>
                    <Text style={styles.equipmentNumber}>{zone.equipment.pcs}</Text>
                    <Text style={styles.equipmentLabel}>Gaming PCs</Text>
                  </View>
                )}
                {zone.equipment.consoles > 0 && (
                  <View style={styles.equipmentCard}>
                    <Text style={styles.equipmentNumber}>{zone.equipment.consoles}</Text>
                    <Text style={styles.equipmentLabel}>Consoles</Text>
                  </View>
                )}
                {zone.equipment.vrHeadsets > 0 && (
                  <View style={styles.equipmentCard}>
                    <Text style={styles.equipmentNumber}>{zone.equipment.vrHeadsets}</Text>
                    <Text style={styles.equipmentLabel}>VR Headsets</Text>
                  </View>
                )}
                {zone.equipment.arcadeMachines > 0 && (
                  <View style={styles.equipmentCard}>
                    <Text style={styles.equipmentNumber}>{zone.equipment.arcadeMachines}</Text>
                    <Text style={styles.equipmentLabel}>Arcade Machines</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Location</Text>
            <TouchableOpacity style={styles.locationCard} onPress={handleDirections}>
              <View style={styles.locationInfo}>
                <Text style={styles.locationAddress}>
                  {zone.location.address}
                </Text>
                <Text style={styles.locationCity}>
                  {zone.location.city}, {zone.location.state} {zone.location.zipCode}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>

          {/* Vendor Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏢 Managed by</Text>
            <View style={styles.vendorCard}>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{zone.vendorId.name}</Text>
                <Text style={styles.vendorEmail}>{zone.vendorId.email}</Text>
              </View>
              {zone.vendorId.phone && (
                <TouchableOpacity style={styles.callButton} onPress={handleCallVendor}>
                  <Ionicons name="call" size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bookingButtonContainer}>
        <TouchableOpacity style={styles.bookingButton} onPress={handleBookNow}>
          <Text style={styles.bookingButtonText}>Book Now</Text>
          <Text style={styles.bookingButtonPrice}>${zone.pricePerHour}/hour</Text>
        </TouchableOpacity>
      </View>
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
    marginTop: 16,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorContent: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  goBackButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageStyle: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 20,
  },
  favoriteButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 20,
  },
  imageNavigation: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageNavButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 20,
  },
  imageIndicators: {
    flexDirection: 'row',
    gap: 8,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeImageIndicator: {
    backgroundColor: 'white',
  },
  infoContainer: {
    backgroundColor: 'white',
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    minHeight: screenHeight * 0.6,
  },
  titleSection: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  zoneName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 16,
  },
  priceTag: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  priceLabel: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  quickInfoContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  quickInfoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  quickInfoText: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityCard: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  amenityText: {
    fontSize: 14,
    color: '#3730a3',
    fontWeight: '500',
  },
  gameTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gameTypeChip: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  gameTypeText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  equipmentCard: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  equipmentNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400e',
  },
  equipmentLabel: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationInfo: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  locationCity: {
    fontSize: 14,
    color: '#6b7280',
  },
  vendorCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  vendorEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  callButton: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 20,
  },
  bookingButtonContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bookingButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bookingButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bookingButtonPrice: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 2,
  },
});