import { Link } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { PDF_BASE_URL } from '@/constants/config';

const PDFCard = ({ _id, title, createdAt, thumbnail, cardWidth, category }: PDF & { cardWidth?: number }) => {
  const thumbnailUri = thumbnail ? { uri: `${PDF_BASE_URL}${thumbnail}` } : 'https://placehold.co/600x800';

  return (
    <Link
      href={{ pathname: "/pdfread/[id]", params: { id: _id.toString() } }}
      asChild
    >
      <TouchableOpacity
        className="mx-1"
        style={{ width: cardWidth ?? "30%" }}
      >
        <Image
          source={thumbnailUri}
          className="w-full h-40 rounded-lg"
          resizeMode="cover"
        />
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
};

export default PDFCard;
