import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { PDF_BASE_URL } from '@/constants/config';
import { getToken } from '@/lib/authStorage';

const PDFCard = React.memo(({ _id, title, createdAt, thumbnail, cardWidth, category }: PDF & { cardWidth?: number }) => {
  const [token, setToken] = useState<string | null>(null);

  // We determine if we are ready to show network images by checking if token check is done.
  // We use a small state variable 'authLoaded' to track if getToken finished.
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    getToken().then(t => {
      setToken(t);
      setAuthLoaded(true);
    });
  }, []);

  const getFullUrl = (base: string, path: any) => {
    if (!path) return '';
    if (typeof path !== 'string') return path;
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    cleanPath = cleanPath.replace(/\\/g, '/'); // Handle Windows path backslashes
    return `${cleanBase}${cleanPath}`;
  };

  const thumbnailUrl = thumbnail ? getFullUrl(PDF_BASE_URL, thumbnail) : null;

  const thumbnailSource = typeof thumbnailUrl === 'string'
    ? { uri: thumbnailUrl, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) }
    : thumbnailUrl
      ? thumbnailUrl
      : { uri: 'https://placehold.co/600x800' };

  return (
    <Link
      href={{ pathname: "/pdfread/[id]", params: { id: _id.toString() } }}
      asChild
    >
      <TouchableOpacity
        className="mx-1"
        style={{ width: cardWidth ?? "30%" }}
        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      >
        {authLoaded || typeof thumbnail !== 'string' ? (
          <Image
            source={thumbnailSource}
            className="w-full h-40 rounded-lg"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-40 rounded-lg bg-gray-800" />
        )}
        <Text
          className="text-sm font-bold text-white mt-2"
          numberOfLines={1}
        >
          {title}
        </Text>

        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-light-300 font-medium mt-0">
            {createdAt?.split("-")[0]}
          </Text>
          <Text
            className="text-xs font-medium text-light-300 uppercase mr-2"
            numberOfLines={1}
          >
            {category}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
});

PDFCard.displayName = 'PDFCard';

export default PDFCard;
