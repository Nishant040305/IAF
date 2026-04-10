import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { PDF_BASE_URL } from '@/constants/config';
import { getToken } from '@/lib/authStorage';
import apiClient from '@/lib/apiClient';

type SignedUrlCacheEntry = {
  url: string;
  expiresAt?: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

const parseExpiresAt = (url: string) => {
  const match = url.match(/[?&]expires=(\d+)/);
  if (!match) return undefined;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds)) return undefined;
  return seconds * 1000;
};

const shouldRefreshSignedUrl = (entry: SignedUrlCacheEntry) => {
  if (!entry.expiresAt) return false;
  return Date.now() >= entry.expiresAt - 15000;
};

const isHttpUrl = (value: string) => value.startsWith('http://') || value.startsWith('https://');

const normalizePath = (value: string) => value.replace(/\\/g, '/');

const extractUploadParts = (value: string) => {
  const normalized = normalizePath(value);
  const trimmed = normalized.startsWith('/') ? normalized.slice(1) : normalized;
  if (!trimmed.startsWith('uploads/')) return null;
  const parts = trimmed.split('/');
  if (parts.length < 3) return null;
  return { folder: parts[1], filename: parts.slice(2).join('/') };
};

const PDFCard = React.memo(({ _id, title, createdAt, thumbnail, cardWidth, category }: PDF & { cardWidth?: number }) => {
  const [token, setToken] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [thumbnailRequiresAuth, setThumbnailRequiresAuth] = useState(false);
  const [thumbnailResolved, setThumbnailResolved] = useState(false);

  // We determine if we are ready to show network images by checking if token check is done.
  // We use a small state variable 'authLoaded' to track if getToken finished.
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    getToken().then(t => {
      setToken(t);
      setAuthLoaded(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveThumbnail = async () => {
      setThumbnailResolved(false);

      if (!thumbnail) {
        if (!cancelled) {
          setThumbnailUri(null);
          setThumbnailRequiresAuth(false);
          setThumbnailResolved(true);
        }
        return;
      }

      if (typeof thumbnail !== 'string') {
        if (!cancelled) {
          setThumbnailUri(null);
          setThumbnailRequiresAuth(false);
          setThumbnailResolved(true);
        }
        return;
      }

      const normalized = normalizePath(thumbnail);

      if (isHttpUrl(normalized)) {
        if (!cancelled) {
          setThumbnailUri(normalized);
          setThumbnailRequiresAuth(false);
          setThumbnailResolved(true);
        }
        return;
      }

      const uploadParts = extractUploadParts(normalized);
      if (uploadParts) {
        const cacheKey = normalized.startsWith('/') ? normalized : `/${normalized}`;
        const cached = signedUrlCache.get(cacheKey);
        if (cached && !shouldRefreshSignedUrl(cached)) {
          if (!cancelled) {
            setThumbnailUri(cached.url);
            setThumbnailRequiresAuth(false);
            setThumbnailResolved(true);
          }
          return;
        }

        try {
          const response = await apiClient.get<any>(
            `/api/pdfs/file/${encodeURIComponent(uploadParts.folder)}/${encodeURIComponent(uploadParts.filename)}`,
            { baseURL: PDF_BASE_URL }
          );
          let url = response.data?.data?.url;
          if (!url) throw new Error('Missing signed URL');
          
          const cleanBase = PDF_BASE_URL.endsWith('/') ? PDF_BASE_URL.slice(0, -1) : PDF_BASE_URL;
          if (url.startsWith('/')) {
            url = `${cleanBase}${url}`;
          } else if (!url.startsWith('http')) {
             url = `${cleanBase}/${url}`;
          }

          const expiresAt = parseExpiresAt(url);
          signedUrlCache.set(cacheKey, { url, expiresAt });
          if (!cancelled) {
            setThumbnailUri(url);
            setThumbnailRequiresAuth(false);
            setThumbnailResolved(true);
          }
          return;
        } catch (err) {
          console.warn('[PDFCard] Failed to fetch signed thumbnail URL', err);
          if (!cancelled) {
            const cleanBase = PDF_BASE_URL.endsWith('/') ? PDF_BASE_URL.slice(0, -1) : PDF_BASE_URL;
            setThumbnailUri(`${cleanBase}${normalized}`);
            setThumbnailRequiresAuth(false);
            setThumbnailResolved(true);
          }
          return;
        }
      }

      const cleanBase = PDF_BASE_URL.endsWith('/') ? PDF_BASE_URL.slice(0, -1) : PDF_BASE_URL;
      const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
      if (!cancelled) {
        setThumbnailUri(`${cleanBase}${cleanPath}`);
        setThumbnailRequiresAuth(true);
        setThumbnailResolved(true);
      }
    };

    resolveThumbnail();

    return () => {
      cancelled = true;
    };
  }, [thumbnail]);

  const thumbnailSource = useMemo(() => {
    if (thumbnail && typeof thumbnail !== 'string') {
      return thumbnail;
    }

    if (thumbnailUri) {
      return {
        uri: thumbnailUri,
        ...(thumbnailRequiresAuth && token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      };
    }

    return { uri: 'https://placehold.co/600x800' };
  }, [thumbnail, thumbnailUri, thumbnailRequiresAuth, token]);

  const canShowThumbnail = !thumbnailRequiresAuth || authLoaded;

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
        {thumbnailResolved && canShowThumbnail ? (
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
