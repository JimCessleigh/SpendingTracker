import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AppTheme } from '../constants/theme';
import { useTranslation } from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    titleKey: 'onboardingTitle1' as const,
    descKey: 'onboardingDesc1' as const,
    icon: 'diamond-outline',
    colors: ['#FFFFFF', '#F5F5F7'],
    darkColors: ['#1A1A1A', '#000000'],
  },
  {
    id: '2',
    titleKey: 'onboardingTitle2' as const,
    descKey: 'onboardingDesc2' as const,
    icon: 'sparkles-outline',
    colors: ['#FFFFFF', '#F0F4FF'],
    darkColors: ['#111827', '#000000'],
  },
  {
    id: '3',
    titleKey: 'onboardingTitle3' as const,
    descKey: 'onboardingDesc3' as const,
    icon: 'flag-outline',
    colors: ['#FFFFFF', '#F5FFF0'],
    darkColors: ['#0A1A12', '#000000'],
  },
];

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    slide: {
      width,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    iconContainer: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: theme.glass.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
      borderWidth: 1,
      borderColor: theme.glass.border,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.text,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
        },
        android: {
          elevation: 5,
        },
      }),
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    description: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.textFaint,
      textAlign: 'center',
      maxWidth: 300,
    },
    footer: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 60 : 40,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    dotContainer: {
      flexDirection: 'row',
      marginBottom: 30,
    },
    dot: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.text,
      marginHorizontal: 4,
    },
    button: {
      width: width - 80,
      height: 56,
      borderRadius: 28,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    buttonGradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: 0.5,
      marginRight: 8,
    },
  });
}

export default function OnboardingScreen() {
  const { state, dispatch } = useApp();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDark = state.darkMode;
  const t = useTranslation();

  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      dispatch({ type: 'COMPLETE_ONBOARDING' });
    }
  };

  const renderItem = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, 50],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale }] }]}>
          <Ionicons name={item.icon as any} size={64} color={theme.colors.primary} />
        </Animated.View>
        
        <Animated.Text style={[styles.title, { opacity, transform: [{ translateY }] }]}>
          {t(item.titleKey)}
        </Animated.Text>

        <Animated.Text style={[styles.description, { opacity, transform: [{ translateY }] }]}>
          {t(item.descKey)}
        </Animated.Text>
      </View>
    );
  };

  const backgroundColors = isDark
    ? SLIDES[currentIndex].darkColors
    : SLIDES[currentIndex].colors;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={backgroundColors as [string, string]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      <Animated.FlatList
        ref={slidesRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={32}
      />

      <View style={styles.footer}>
        <View style={styles.dotContainer}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [6, 24, 6],
              extrapolate: 'clamp',
            });
            
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.2, 1, 0.2],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={i.toString()}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={handleNext}>
          <LinearGradient
            colors={theme.gradients.primary as [string, string]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.buttonText}>
              {currentIndex === SLIDES.length - 1 ? t('getStarted') : t('continueBtn')}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
