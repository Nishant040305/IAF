import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Image, ImageBackground, View } from 'react-native';

import { icons } from '@/constants/icons';
import { images } from '@/constants/images';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const { token, initializing } = useAuth();

  useEffect(() => {
    if (initializing) return;
    if (token) {
      router.replace('/(tabs)');
    } else {
      router.replace('/auth/login');
    }
  }, [initializing, router, token]);

  return (
    <ImageBackground source={images.bg} className="flex-1 bg-black" resizeMode="cover">
      <View className="flex-1 justify-center items-center bg-black/60">
        <Image source={icons.logo} className="w-32 h-32 mb-6" resizeMode="contain" />
        <ActivityIndicator size="large" color="#5B5FEF" />
      </View>
    </ImageBackground>
  );
}
