import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const logoSource = require('../../../assets/android-icon-foreground.png');

interface FluttrLogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export function FluttrLogo({ size = 32, style }: FluttrLogoProps) {
  return (
    <Image
      source={logoSource}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
