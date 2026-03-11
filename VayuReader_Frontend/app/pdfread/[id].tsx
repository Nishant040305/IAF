import { useNavigation } from '@react-navigation/native';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Pdf from 'react-native-pdf';

import { PDF_BASE_URL } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/apiClient';

type PdfDocument = {
  _id: string;
  title: string;
  pdfUrl: string;
  thumbnail?: string;
  createdAt: string;
  viewCount: number;
  category: string;
};

const formatAccessedAt = (value: Date) => {
  const pad = (input: number) => String(input).padStart(2, '0');
  const day = pad(value.getDate());
  const month = pad(value.getMonth() + 1);
  const year = String(value.getFullYear())
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const buildWatermarkItems = (width: number, height: number) => {
  const columns = 3;
  const rows = 6;
  const horizontalStep = width / columns;
  const verticalStep = height / rows;
  const items: { key: string; left: number; top: number }[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const rowOffset = row % 2 === 0 ? 0 : horizontalStep * 0.35;
      items.push({
        key: `${row}-${column}`,
        left: column * horizontalStep + rowOffset - 24,
        top: row * verticalStep + verticalStep * 0.16,
      });
    }
  }

  return items;
};

export default function PdfDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user, initializing } = useAuth();
  const { width, height } = useWindowDimensions();
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessedAt, setAccessedAt] = useState(() => formatAccessedAt(new Date()));
  const navigation = useNavigation();

  useLayoutEffect(() => {
    if (doc?.title) {
      navigation.setOptions({
        title: doc.title,
        headerBackTitle: 'Back',
        headerTitleAlign: 'center',
      });
    }
  }, [doc, navigation]);

  useEffect(() => {
    if (id) {
      setAccessedAt(formatAccessedAt(new Date()));
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<any>(`/api/pdfs/${id}`, {
          baseURL: PDF_BASE_URL,
        });
        const data = response.data.data;
        setDoc(data);
      } catch (e: any) {
        setError(e.message || 'Failed to load PDF details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading || initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5B5FEF" />
      </View>
    );
  }

  if (error || !doc) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red' }}>{error || 'PDF not found'}</Text>
      </View>
    );
  }

  const getFullUrl = (base: string, path: any) => {
    if (!path) return '';
    if (typeof path !== 'string') return path;
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    cleanPath = cleanPath.replace(/\\/g, '/'); // Handle Windows path backslashes
    return `${cleanBase}${cleanPath}`;
  };

  const pdfUrl = doc.pdfUrl ? getFullUrl(PDF_BASE_URL, doc.pdfUrl) : '';
  const watermarkLabel = `${user?.phone_number ?? 'Unknown user'} ${accessedAt}`;
  const watermarkItems = buildWatermarkItems(width, height);

  const pdfSource = {
    uri: pdfUrl,
    cache: true,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  };

  return (
    <>
      <Stack>
        <Stack.Screen
          options={{
            title: 'PDF Viewer',
            headerBackTitle: 'Back',
            headerTitleAlign: 'center',
          }}
        />
      </Stack>
      <View style={styles.container}>
        <Pdf
          source={pdfSource}
          style={[styles.pdf, { width }]}
          trustAllCerts={false}
          onLoadComplete={() => {
            // Loaded
          }}
        />
        <View pointerEvents="none" style={styles.watermarkLayer}>
          {watermarkItems.map(item => (
            <Text
              key={item.key}
              style={[
                styles.watermarkText,
                {
                  left: item.left,
                  top: item.top,
                },
              ]}
            >
              {watermarkLabel}
            </Text>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdf: {
    flex: 1,
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  watermarkText: {
    position: 'absolute',
    width: 260,
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
    opacity: 0.26,
    transform: [{ rotate: '-24deg' }],
  },
});
