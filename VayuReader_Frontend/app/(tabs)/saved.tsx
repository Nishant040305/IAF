import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import SearchBar from '@/components/SearchBar';
import { ListSkeleton } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { ABBR_BASE_URL } from '@/constants/config';
import { icons } from '@/constants/icons';
import { images } from '@/constants/images';
import apiClient from '@/lib/apiClient';

type AbbrevObj = {
  abbreviation: string;
  fullForm: string;
};

const PAGE_SIZE = 50;

export default function AbbreviationScreen() {
  const [abbreviations, setAbbreviations] = useState<AbbrevObj[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch abbreviations with server-side pagination
  const fetchAbbreviations = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await apiClient.get<any>('/api/abbreviations/all', {
        baseURL: ABBR_BASE_URL,
        params: {
          page,
          limit: PAGE_SIZE,
        },
      });

      const data = res.data.data;
      const items = data.abbreviations || [];

      if (page === 1 || isRefresh) {
        setAbbreviations(items);
      } else {
        // Append for infinite scroll
        setAbbreviations(prev => [...prev, ...items]);
      }

      // Update pagination info
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setCurrentPage(data.pagination.page || page);
      }
    } catch (err: any) {
      const endpoint = `${ABBR_BASE_URL}/api/abbreviations/all`;
      const statusCode = err?.response?.status || 'No status';
      const serverMessage = err?.response?.data?.message;
      const errorMessage = err?.message;
      const message = serverMessage || errorMessage || 'Failed to load abbreviations.';
      Alert.alert(
        'Failed to load abbreviations',
        `Error: ${message}\n\nEndpoint: ${endpoint}\nStatus: ${statusCode}\nTrace: ${errorMessage || 'No trace'}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchAbbreviations(1);
  }, [fetchAbbreviations]);

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchAbbreviations(1, true);
  };

  const loadMore = () => {
    if (!loadingMore && !searchText && currentPage < totalPages) {
      fetchAbbreviations(currentPage + 1);
    }
  };

  // Handle back button
  useEffect(() => {
    const onBack = () => {
      if (searchText) {
        setSearchText('');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [searchText]);

  // API search for specific abbreviation
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchApi = useCallback(async (query: string) => {
    if (!query.trim()) return;
    try {
      const res = await apiClient.get<any>(
        `/api/abbreviations/${query.trim().toUpperCase()}`,
        { baseURL: ABBR_BASE_URL }
      );
      const obj = res.data;
      // Add to list if not already present
      setAbbreviations((prev) => {
        const exists = prev.find((p) => p.abbreviation === obj.abbreviation);
        if (exists) return prev;
        return [obj, ...prev];
      });
    } catch {
      // ignore lookup error
    }
  }, []);

  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!query.trim()) return;
    debounceTimer.current = setTimeout(() => searchApi(query), 400);
  }, [searchApi]);

  useEffect(() => {
    debouncedSearch(searchText);
  }, [searchText, debouncedSearch]);

  // Filter locally when searching
  const filteredData = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return abbreviations;
    return abbreviations.filter((item) =>
      (item.abbreviation?.toLowerCase() || '').includes(q) ||
      (item.fullForm?.toLowerCase() || '').includes(q)
    );
  }, [searchText, abbreviations]);

  const renderItem = ({ item }: { item: AbbrevObj }) => (
    <View className="bg-[#1A1A40] rounded-xl p-4 mb-4">
      <Text className="text-white text-lg font-bold">{item.abbreviation}</Text>
      <Text className="text-gray-300 text-sm mt-1">{item.fullForm}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <Image source={images.bg} className="absolute" />
      <Image
        source={icons.logo}
        className="w-24 h-28 mt-14 mb-5 self-center"
      />

      <View className="px-5 mb-3">
        <SearchBar
          placeholder="Search an abbreviation"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading && (
        <ListSkeleton count={8} />
      )}

      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => `${item.abbreviation}-${index}`}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5B5FEF"
            colors={['#5B5FEF']}
          />
        }
        initialNumToRender={15}
        maxToRenderPerBatch={25}
        windowSize={10}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24,
          paddingTop: loading ? 0 : 8,
        }}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              type="abbreviation"
              searchQuery={searchText || undefined}
              message={searchText ? 'Try a different abbreviation' : 'No abbreviations available'}
            />
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color="#5B5FEF" />
              <Text className="text-gray-400 mt-2">Loading more...</Text>
            </View>
          ) : !searchText && currentPage < totalPages ? (
            <Text className="text-center text-gray-500 py-4">Scroll for more</Text>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}
