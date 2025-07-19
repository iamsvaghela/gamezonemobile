// app/vendor/welcome.tsx - Updated to use AuthHeader styling
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import AuthHeader from '../../components/AuthHeader';
import { useRouter } from 'expo-router';

export default function VendorWelcome() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  // Check if user should be on this page
  useEffect(() => {
    const checkAccess = async () => {
      // Don't do anything if still loading auth
      if (isLoading) {
        console.log('🔄 Auth still loading, waiting...');
        return;
      }
      
      // Wait a bit for the app to fully initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isLoggedIn || !user || user.role !== 'vendor') {
        console.log('🚫 Non-vendor accessing welcome, redirecting...');
        try {
          router.replace('/(tabs)');
        } catch (navError) {
          console.error('Navigation error:', navError);
          // Fallback navigation
          setTimeout(() => {
            router.push('/(tabs)');
          }, 500);
        }
        return;
      }
    };

    checkAccess();
  }, [isLoggedIn, user, isLoading]);

  const FeatureCard = ({ title, description, icon, onPress }: {
    title: string;
    description: string;
    icon: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.featureCard} onPress={onPress}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Use AuthHeader which will automatically show vendor styling */}
      <AuthHeader />
      
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              Welcome to Your Vendor Portal! 🎉
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Manage your gaming zones, track bookings, and grow your business with our comprehensive vendor tools.
            </Text>
          </View>

          {/* Getting Started */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Getting Started</Text>
            <View style={styles.stepsContainer}>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Set Up Your Gaming Zones</Text>
                  <Text style={styles.stepDescription}>
                    Add your gaming zones with details, pricing, and availability
                  </Text>
                </View>
              </View>
              
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Configure Booking Settings</Text>
                  <Text style={styles.stepDescription}>
                    Set up time slots, pricing, and booking policies
                  </Text>
                </View>
              </View>
              
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Start Accepting Bookings</Text>
                  <Text style={styles.stepDescription}>
                    Your zones will be live and ready for customer bookings
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Features</Text>
            <View style={styles.featuresGrid}>
              <FeatureCard
                title="Zone Management"
                description="Add, edit, and manage your gaming zones"
                icon="🎮"
                onPress={() => router.push('/vendor/zones')}
              />
              <FeatureCard
                title="Booking Management"
                description="View and manage all customer bookings"
                icon="📅"
                onPress={() => router.push('/vendor/bookings')}
              />
              <FeatureCard
                title="Revenue Analytics"
                description="Track your earnings and performance"
                icon="📊"
                onPress={() => router.push('/vendor/analytics')}
              />
              <FeatureCard
                title="Customer Reviews"
                description="Monitor and respond to customer feedback"
                icon="⭐"
                onPress={() => router.push('/vendor/reviews')}
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={() => router.push('/vendor/dashboard')}
              >
                <Text style={styles.primaryActionText}>Go to Dashboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => router.push('/vendor/zones/add')}
              >
                <Text style={styles.secondaryActionText}>Add Your First Zone</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Support */}
          <View style={styles.section}>
            <View style={styles.supportCard}>
              <Text style={styles.supportIcon}>💬</Text>
              <Text style={styles.supportTitle}>Need Help?</Text>
              <Text style={styles.supportDescription}>
                Our support team is here to help you get started and answer any questions.
              </Text>
              <TouchableOpacity
                style={styles.supportButton}
                onPress={() => router.push('/vendor/support')}
              >
                <Text style={styles.supportButtonText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  stepsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  quickActionsContainer: {
    gap: 12,
  },
  primaryAction: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryAction: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  supportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  supportIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  supportDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  supportButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});