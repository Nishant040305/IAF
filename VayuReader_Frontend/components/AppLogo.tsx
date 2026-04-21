import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

import { icons } from '@/constants/icons';

export type AppLogoVariant = 'home' | 'tab' | 'otp-screen';

export const APP_LOGO_STYLES: Record<AppLogoVariant, ImageStyle> = {
  home: {
    alignSelf: 'center',
    width: 96,
    height: 112,
    marginTop: 56,
    marginBottom: 20,
  },
  tab: {
    alignSelf: 'center',
    width: 96,
    height: 112,
    marginTop: 56,
    marginBottom: 20,
  },
  "otp-screen": {
    alignSelf: 'center',
    width: 72,
    height: 88,
    marginTop: 0,
    marginBottom: 0,
  },
};

type AppLogoProps = {
  variant?: AppLogoVariant;
  style?: StyleProp<ImageStyle>;
};

export default function AppLogo({ variant = 'tab', style }: AppLogoProps) {
  return (
    <Image
      source={icons.logo}
      resizeMode="contain"
      style={[APP_LOGO_STYLES[variant], style]}
    />
  );
}
