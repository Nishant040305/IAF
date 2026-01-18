import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  FlatList,
  Image,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import PDFCard from "@/components/PDFCard";
import SearchBar from "@/components/SearchBar";
import { PDFGridSkeleton } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { PDF_BASE_URL } from '@/constants/config';
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import apiClient from '@/lib/apiClient';
import { usePdfEvents, PdfEvent } from '@/hooks/usePdfEvents';

type RenderItemProps = { item: PDF };
type RenderCategoryItemProps = { item: string };

export default function Index() {
  const [allPdfs, setAllPdfs] = useState<PDF[]>([]);
  const [activeCat, setActiveCat] = useState<string>('All');
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const PAGE_SIZE = 50;

  const fetchPdfs = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await apiClient.get<any>('/api/pdfs/all', {
        baseURL: PDF_BASE_URL,
        params: {
          page,
          limit: PAGE_SIZE,
        },
      });

      const data = response.data.data;
      const documents = data.documents || [];
      const mappedDocs = documents.map((d: any) => ({ ...d, id: d._id }));

      if (page === 1 || isRefresh) {
        setAllPdfs(mappedDocs);
      } else {
        // Append new documents for infinite scroll
        setAllPdfs(prev => [...prev, ...mappedDocs]);
      }

      // Update pagination info
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setCurrentPage(data.pagination.page || page);
      }
    } catch (err: any) {
      const endpoint = `${PDF_BASE_URL}/api/pdfs/all`;
      const statusCode = err?.response?.status || 'No status';
      const serverMessage = err?.response?.data?.message;
      const errorMessage = err?.message;
      const message = serverMessage || errorMessage || 'Failed to fetch PDFs.';
      Alert.alert(
        'Failed to load PDFs',
        `Error: ${message}\n\nEndpoint: ${endpoint}\nStatus: ${statusCode}\nTrace: ${errorMessage || 'No trace'}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  // SSE Event Handler - Real-time PDF updates
  const handlePdfEvent = useCallback(async (event: PdfEvent) => {
    console.log('[SSE] Received event:', event.type, event.data);

    switch (event.type) {
      case 'PDF_ADDED':
        // Fetch the new PDF details by ID (SSE only sends ID for security)
        if (event.data.id) {
          try {
            const response = await apiClient.get<any>(`/api/pdfs/${event.data.id}`, {
              baseURL: PDF_BASE_URL,
            });
            const pdfData = response.data?.data;
            if (pdfData) {
              const newPdf: PDF = {
                _id: pdfData._id,
                title: pdfData.title,
                category: pdfData.category,
                pdfUrl: pdfData.pdfUrl,
                thumbnail: pdfData.thumbnail,
                viewCount: pdfData.viewCount || 0,
                createdAt: pdfData.createdAt,
              };
              setAllPdfs(prev => [newPdf, ...prev]);
            }
          } catch (err) {
            console.error('[SSE] Failed to fetch new PDF details:', err);
          }
        }
        break;
      case 'PDF_UPDATED':
        // Fetch updated PDF details by ID
        if (event.data.id) {
          try {
            const response = await apiClient.get<any>(`/api/pdfs/${event.data.id}`, {
              baseURL: PDF_BASE_URL,
            });
            const pdfData = response.data?.data;
            if (pdfData) {
              setAllPdfs(prev => prev.map(pdf =>
                pdf._id === event.data.id
                  ? { ...pdf, title: pdfData.title, category: pdfData.category, thumbnail: pdfData.thumbnail }
                  : pdf
              ));
            }
          } catch (err) {
            console.error('[SSE] Failed to fetch updated PDF details:', err);
          }
        }
        break;
      case 'PDF_DELETED':
        // Remove the PDF from the list
        setAllPdfs(prev => prev.filter(pdf => pdf._id !== event.data.id));
        break;
      case 'connected':
        console.log('[SSE] Connected to real-time updates');
        break;
    }
  }, []);

  // Subscribe to SSE events for real-time updates
  usePdfEvents(handlePdfEvent, [handlePdfEvent]);

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchPdfs(1, true);
  };

  const loadMorePdfs = () => {
    if (!loadingMore && currentPage < totalPages) {
      fetchPdfs(currentPage + 1);
    }
  };

  useEffect(() => {
    const handleBackPress = () => {
      if (searchText) {
        setSearchText('');
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [searchText]);

  useEffect(() => {
    fetchPdfs(1);
  }, [fetchPdfs]);

  const recentData = useMemo(
    () =>
      [...allPdfs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
    [allPdfs]
  );

  const popularData = useMemo(() => allPdfs.slice(0, 10), [allPdfs]);

  const categories = useMemo(
    () => Array.from(new Set(allPdfs.map(p => p.category))),
    [allPdfs]
  );

  // Debounced search - waits 300ms after user stops typing
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchText]);

  const searchResults = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return [];
    return allPdfs.filter(p => p.title.toLowerCase().includes(q));
  }, [debouncedSearch, allPdfs]);

  const gridData = useMemo(() => {
    return activeCat === 'All'
      ? allPdfs
      : allPdfs.filter(p => p.category === activeCat);
  }, [activeCat, allPdfs]);

  const displayData = debouncedSearch ? searchResults : gridData;

  const renderHorizontal = ({ item }: RenderItemProps) => (
    <View style={{ marginRight: 12 }}>
      <PDFCard {...item} cardWidth={100} />
    </View>
  );

  const renderCategory = ({ item }: RenderCategoryItemProps) => (
    <Text
      onPress={() => setActiveCat(item)}
      className={`px-4 py-2 mr-3 rounded-full ${activeCat === item ? 'bg-[#5B5FEF]' : 'bg-[#1C1B3A]'}`}
      style={{ color: 'white', fontSize: 15 }}
    >{item}</Text>
  );

  const renderGrid = ({ item }: RenderItemProps) => (
    <View className="mb-5 mr-3">
      <PDFCard {...item} cardWidth={100} />
    </View>
  );

  const ListHeader = () => (
    <>
      {!debouncedSearch && (
        <>
          <Text className="text-white font-bold mt-4 mb-5 px-2" style={{ fontSize: 19 }}>
            Recently Uploaded PDFs
          </Text>
          <FlatList
            data={recentData}
            horizontal
            keyExtractor={(item) => item._id}
            renderItem={renderHorizontal}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 0, paddingBottom: 8 }}
          />
          <View className="h-px bg-gray-700 my-2 mt-2" />

          <Text className="text-white font-bold mt-4 mb-5 px-2" style={{ fontSize: 19 }}>
            Mostly Accessed PDFs
          </Text>
          <FlatList
            data={popularData}
            horizontal
            keyExtractor={(item) => item._id}
            renderItem={renderHorizontal}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 0, paddingBottom: 8 }}
          />
          <View className="h-px bg-gray-700 my-2 mt-2" />
          <Text className="text-white  font-bold mt-4 mb-3 px-2" style={{ fontSize: 20 }}>
            Categories
          </Text>
          <FlatList
            data={['All', ...categories]}
            horizontal
            keyExtractor={i => i}
            renderItem={renderCategory}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 4, paddingBottom: 8 }}
          />

          <Text className="text-white font-bold mt-4 mb-4 px-2" style={{ fontSize: 19 }}>
            {activeCat === 'All' ? 'All PDF' : `${activeCat} PDF`}
          </Text>
        </>
      )}

      {debouncedSearch && (
        <Text className="text-white text-lg font-bold mt-4 mb-4 px-2">
          Search results for "{debouncedSearch}"
        </Text>
      )}
    </>
  );

  return (
    <View className="flex-1 bg-black">
      <Image source={images.bg} className="absolute " />
      <Image source={icons.logo} className="w-24 h-28 mt-14 mb-6 self-center" />
      <View className="px-5 mb-4">
        <SearchBar
          placeholder="Search for a PDF"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading && (
        <PDFGridSkeleton count={9} />
      )}

      <FlatList
        data={displayData}
        keyExtractor={(item) => item._id}
        renderItem={renderGrid}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: 'flex-start' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 16 }}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          !loading && debouncedSearch ? (
            <EmptyState
              type="search"
              searchQuery={debouncedSearch}
              message="Try a different search term"
            />
          ) : !loading && displayData.length === 0 ? (
            <EmptyState type="pdf" />
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <Text className="text-center text-gray-400 py-4">Loading more...</Text>
          ) : currentPage < totalPages && !debouncedSearch ? (
            <Text className="text-center text-gray-500 py-4">Scroll for more</Text>
          ) : null
        }
        onEndReached={debouncedSearch ? undefined : loadMorePdfs}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5B5FEF"
            colors={['#5B5FEF']}
          />
        }
        // Performance optimizations
        initialNumToRender={12}
        maxToRenderPerBatch={15}
        windowSize={5}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 180, // Approximate height of each row (card + margin)
          offset: 180 * Math.floor(index / 3),
          index,
        })}
      />
    </View>
  );
}
