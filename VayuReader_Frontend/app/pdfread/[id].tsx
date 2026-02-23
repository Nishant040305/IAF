import { useNavigation } from '@react-navigation/native';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import Pdf from 'react-native-pdf';

import { PDF_BASE_URL } from '@/constants/config';
import apiClient from '@/lib/apiClient';
import { getToken } from '@/lib/authStorage';

type PdfDocument = {
  _id: string;
  title: string;
  pdfUrl: string;
  thumbnail?: string;
  createdAt: string;
  viewCount: number;
  category: string;
};

export default function PdfDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
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
    // Fetch auth token for authenticated file access
    getToken().then(t => {
      setToken(t);
      setAuthLoaded(true);
    });
  }, []);

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

  if (loading || !authLoaded) {
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
          style={styles.pdf}
          trustAllCerts={false}
          onLoadComplete={() => {
            // Loaded
          }}
        />
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
    width: Dimensions.get('window').width,
  },
});
