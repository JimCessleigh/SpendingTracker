import React from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  /** 'mascot' = character only · 'full' = character + "pockyt SPENDING TRACKER" · 'card' = holding credit card · 'spending' = throwing cash */
  variant?: 'mascot' | 'full' | 'card' | 'spending';
  /** Width in dp — height calculated from aspect ratio */
  width?: number;
}

export default function PockytLogo({ variant = 'full', width = 220 }: Props) {
  const theme = useTheme();

  if (variant === 'mascot' || variant === 'card' || variant === 'spending') {
    let source = require('../../assets/logo_mascot.png');
    if (variant === 'card') source = require('../../assets/logo_mascot_card.png');
    if (variant === 'spending') source = require('../../assets/logo_mascot_spending.png');

    return (
      <View style={{ width, height: width }}>
        <Image
          style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
          source={source}
        />
      </View>
    );
  }

  // Full logo — mascot + "pockyt" + "SPENDING TRACKER"
  const height = Math.round(width * 0.28);
  const mascotBoundingSize = height; 

  return (
    <View style={{ width, height, flexDirection: 'row', alignItems: 'center' }}>
      
      {/* Dynamic Drop Shadow Wrapper for the Character */}
      <View style={{ width: mascotBoundingSize, height: mascotBoundingSize, marginRight: 14 }}>
        <Image
          style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
          source={require('../../assets/logo_mascot.png')}
        />
      </View>

      {/* Styled Native Text matching App Theme */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ 
          fontSize: height * 0.44, 
          fontWeight: '300', 
          color: theme.colors.text, 
          letterSpacing: 1, 
          lineHeight: height * 0.52,
        }}>
          Pockyt
        </Text>
        <Text style={{ 
          fontSize: height * 0.14, 
          fontWeight: '500', 
          color: theme.colors.textMuted, 
          letterSpacing: 3,
          marginTop: 2
        }}>
          SPENDING TRACKER
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({});
