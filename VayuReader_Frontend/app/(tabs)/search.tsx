import { useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import SearchBar from '@/components/SearchBar';
import { DICT_BASE_URL } from '@/constants/config';
import { icons } from '@/constants/icons';
import { images } from '@/constants/images';
import apiClient from '@/lib/apiClient';

type WordObj = {
  word: string;
  meanings: { definition: string; partOfSpeech: string; examples?: string[] }[];
  synonyms?: string[];
};

export default function DictionaryScreen() {
  const router = useRouter();

  const [searchText, setSearchText] = useState('');
  const [data, setData] = useState<WordObj[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filterValidWords = (words: WordObj[]) =>
    words.filter(word => word.meanings?.[0]?.definition?.trim());

  const onRefresh = () => {
    if (searchText.trim()) {
      setRefreshing(true);
      debouncedLookup(searchText.trim());
    }
  };

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedLookup = useCallback((word: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = word.trim();
    if (!q) {
      setData([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/api/dictionary/search/${q}`, {
          baseURL: DICT_BASE_URL,
        });
        const result = res.data;
        const words: WordObj[] = result.words;
        const filtered = filterValidWords(words);
        setData(filtered);
      } catch (err) {
        setData([]);
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
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [searchText]);

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

      {!searchText && data.length === 0 && !loading && (
        <Text
          className="text-center text-gray-400 mb-2 mt-10"
          style={{ fontSize: 16 }}
        >
          Search a word to see its meaning.
        </Text>
      )}

      {loading && (
        <View className="items-center justify-center my-4">
          <ActivityIndicator size="large" color="#5B5FEF" />
          <Text className="text-white mt-2">Searching...</Text>
        </View>
      )}

      <FlatList
        data={data}
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
          flexGrow: data.length === 0 ? 1 : undefined,
          justifyContent: data.length === 0 ? 'center' : undefined,
        }}
        ListEmptyComponent={
          !loading ? (
            <Text
              className="text-center text-gray-400 mt-10 px-5"
              style={{ fontSize: 15 }}
            >
              {searchText
                ? 'Word not found.'
                : ''}
            </Text>
          ) : null
        }
      />
    </View>
  );
}
