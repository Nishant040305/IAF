import { useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
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
  TouchableOpacity,
  View
} from 'react-native';

import SearchBar from '@/components/SearchBar';
import { ListSkeleton } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { DICT_BASE_URL } from '@/constants/config';
import { icons } from '@/constants/icons';
import { images } from '@/constants/images';
import apiClient from '@/lib/apiClient';

type WordObj = {
  word: string;
  meanings: { definition: string; partOfSpeech: string; examples?: string[] }[];
  synonyms?: string[];
};

const PAGE_SIZE = 50;

export default function DictionaryScreen() {
  const router = useRouter();

  const [searchText, setSearchText] = useState('');
  const [data, setData] = useState<WordObj[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state for browsing all words
  const [allWords, setAllWords] = useState<WordObj[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [browsingAll, setBrowsingAll] = useState(true);

  const filterValidWords = (words: WordObj[]) =>
    words.filter(word => word.meanings?.[0]?.definition?.trim());

  // Fetch all words with pagination (for browsing)
  const fetchAllWords = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await apiClient.get<any>('/api/dictionary/words/all', {
        baseURL: DICT_BASE_URL,
        params: {
          page,
          limit: PAGE_SIZE,
        },
      });

      const responseData = res.data.data;
      const words = responseData.words || [];
      const filtered = filterValidWords(words);

      if (page === 1 || isRefresh) {
        setAllWords(filtered);
      } else {
        setAllWords(prev => [...prev, ...filtered]);
      }

      if (responseData.pagination) {
        setTotalPages(responseData.pagination.totalPages || 1);
        setCurrentPage(responseData.pagination.page || page);
      }
    } catch (err: any) {
      const endpoint = `${DICT_BASE_URL}/api/dictionary/words/all`;
      const statusCode = err?.response?.status || 'No status';
      const serverMessage = err?.response?.data?.message;
      const errorMessage = err?.message;
      const message = serverMessage || errorMessage || 'Failed to load dictionary.';
      console.error('Failed to fetch words', err);
      Alert.alert(
        'Failed to load dictionary',
        `Error: ${message}\n\nEndpoint: ${endpoint}\nStatus: ${statusCode}\nTrace: ${errorMessage || 'No trace'}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllWords(1);
  }, [fetchAllWords]);

  const loadMoreWords = () => {
    if (!loadingMore && browsingAll && currentPage < totalPages) {
      fetchAllWords(currentPage + 1);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (searchText.trim()) {
      debouncedLookup(searchText.trim());
    } else {
      setBrowsingAll(true);
      setCurrentPage(1);
      fetchAllWords(1, true);
    }
  };

  // Search functionality with debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedLookup = useCallback((word: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = word.trim();
    if (!q) {
      setData([]);
      setBrowsingAll(true);
      return;
    }

    setBrowsingAll(false);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<any>(`/api/dictionary/search/${q}`, {
          baseURL: DICT_BASE_URL,
        });
        const words: WordObj[] = res.data.data;
        const filtered = filterValidWords(words);
        setData(filtered);
      } catch (err: any) {
        const endpoint = `${DICT_BASE_URL}/api/dictionary/search/${q}`;
        const statusCode = err?.response?.status || 'No status';
        const serverMessage = err?.response?.data?.message;
        const errorMessage = err?.message;
        const message = serverMessage || errorMessage || 'Search failed.';
        setData([]);
        Alert.alert(
          'Search failed',
          `Error: ${message}\n\nEndpoint: ${endpoint}\nStatus: ${statusCode}\nTrace: ${errorMessage || 'No trace'}`
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, 400);
  }, []);

  useEffect(() => {
    debouncedLookup(searchText);
  }, [searchText, debouncedLookup]);

  useEffect(() => {
    const back = () => {
      if (searchText) {
        setSearchText('');
        setData([]);
        setBrowsingAll(true);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [searchText]);

  // Display data - search results or all words
  const displayData = searchText.trim() ? data : allWords;

  const renderItem = ({ item }: { item: WordObj }) => {
    const meaning = item.meanings?.[0]?.definition ?? 'No definition';
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/word/[word]',
            params: {
              word: item.word,
              definition: meaning,
              pos: item.meanings?.[0]?.partOfSpeech,
              examples: JSON.stringify(item.meanings?.[0]?.examples || []),
              synonyms: item.synonyms?.join(', ') || '',
            },
          })
        }
        className="bg-[#1A1A40] rounded-xl p-4 mb-4"
      >
        <Text className="text-white text-lg font-bold">{item.word}</Text>
        <Text className="text-gray-300 text-sm mt-1">{meaning}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-black">
      <Image source={images.bg} className="absolute" />
      <Image source={icons.logo} className="w-24 h-28 mt-14 mb-5 self-center" />

      <View className="px-5 mb-3">
        <SearchBar
          placeholder="Search a word"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading && displayData.length === 0 && (
        <ListSkeleton count={8} />
      )}

      <FlatList
        data={displayData}
        keyExtractor={(item) => item.word}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5B5FEF"
            colors={['#5B5FEF']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24,
          flexGrow: displayData.length === 0 ? 1 : undefined,
          justifyContent: displayData.length === 0 ? 'center' : undefined,
        }}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              type="dictionary"
              searchQuery={searchText || undefined}
              message={searchText ? 'Try a different spelling' : 'Start typing to search'}
            />
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color="#5B5FEF" />
              <Text className="text-gray-400 mt-2">Loading more...</Text>
            </View>
          ) : browsingAll && currentPage < totalPages ? (
            <Text className="text-center text-gray-500 py-4">Scroll for more</Text>
          ) : null
        }
        onEndReached={browsingAll ? loadMoreWords : undefined}
        onEndReachedThreshold={0.5}
        // Performance optimizations
        initialNumToRender={15}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews={true}
      />
    </View>
  );
}
