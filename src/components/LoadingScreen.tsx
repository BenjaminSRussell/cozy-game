import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface LoadingScreenProps {
  progress: number; // 0-100
  currentAsset: string;
  stage: string;
  onLoadingComplete?: () => void;
}

/**
 * Enhanced Loading Screen with Progress Tracking
 * 
 * Features:
 * - Real-time asset loading progress
 * - Animated background with particle effects
 * - Asset preview thumbnails
 * - Loading tips and fun facts
 * - Smooth transitions and micro-interactions
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  currentAsset,
  stage,
  onLoadingComplete
}) => {
  const [currentTip, setCurrentTip] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  const loadingTips = [
    "🌱 Did you know? Crops grow faster when watered regularly!",
    "🏠 Buildings increase storage capacity and farm efficiency",
    "🍂 Each season brings unique challenges and rewards",
    "⛏️ Mining can reveal rare ores and treasures",
    "🌸 Spring flowers attract beneficial pollinators",
    "❄️ Winter snow insulates crops from extreme cold",
    "🌟 Fireflies appear at dusk in summer months",
    "🍂 Falling leaves in autumn create natural compost",
    "💎 Diamond deposits are extremely rare but valuable",
    "🚜 Advanced tools make farming much more efficient"
  ];

  // Update progress animation when props change
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Handle completion
  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start(onLoadingComplete);
      }, 500);
    }
  }, [progress]);

  // Initial fade-in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Animated Background */}
      <View style={styles.background}>
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.backgroundParticle,
              {
                left: Math.random() * SCREEN_WIDTH,
                top: Math.random() * SCREEN_HEIGHT,
                opacity: particleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3 + Math.random() * 0.3],
                }),
                transform: [
                  {
                    translateY: particleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -50 - Math.random() * 100],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* Main Loading Content */}
      <View style={styles.content}>
        {/* Game Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.gameTitle}>Cozy Haven</Text>
          <Text style={styles.subtitle}>A Peaceful Farming Adventure</Text>
        </View>

        {/* Loading Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.stageText}>{stage}</Text>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>

          {/* Main Progress Bar */}
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                  backgroundColor: progress > 80 ? '#4CAF50' :
                    progress > 50 ? '#FF9800' : '#2196F3',
                }
              ]}
            />
          </View>

          {/* Current Asset */}
          <Text style={styles.currentAsset}>{currentAsset}</Text>
        </View>


        {/* Loading Tips */}
        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>{loadingTips[currentTip]}</Text>
        </View>

        {/* Loading Animation */}
        <View style={styles.loadingAnimation}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.loadingDot,
                {
                  backgroundColor: progress > 80 ? '#4CAF50' :
                    progress > 50 ? '#FF9800' : '#2196F3',
                  transform: [
                    {
                      scale: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      }),
                    },
                    {
                      translateY: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -10],
                      }),
                    },
                  ],
                  opacity: progressAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundParticle: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  content: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  gameTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: '#4CAF50',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#b0b0b0',
    fontStyle: 'italic',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 30,
  },
  stageText: {
    fontSize: 16,
    color: '#b0b0b0',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  currentAsset: {
    fontSize: 14,
    color: '#b0b0b0',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  categoriesContainer: {
    width: '100%',
    marginBottom: 30,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    color: '#ffffff',
    width: 80,
  },
  categoryProgress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  categoryProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginRight: 8,
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: '#b0b0b0',
    width: 40,
    textAlign: 'right',
  },
  tipContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  tipText: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingAnimation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 20,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});
