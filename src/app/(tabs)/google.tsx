import { useQuery } from '@tanstack/react-query';
import { Stack, Link, router } from 'expo-router';
import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Alert, Image } from 'react-native';

import { Container } from '~/components/Container';
import { YT_CHANNELS_DATASET_ID } from '~/constants';
import { supabase } from '~/lib/supabase';

const fetchSearches = async () => {
  const { data, error } = await supabase
    .from('serp_search')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    throw error;
  }
  return data;
};

export default function Home() {
  const [query, setQuery] = useState('');

  const {
    data: searches,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['searches'],
    queryFn: () => fetchSearches(),
  });

  const startAnalyzing = async () => {
    if (!query) {
      return;
    }
    // Update logic for Google SERP analysis
    const { data: existingSearches, error: searchError } = await supabase
      .from('google_searches')
      .select('*')
      .eq('query', query);

    if (existingSearches && existingSearches.length > 0) {
      router.push(`/serp/${existingSearches[0].id}`);
      return;
    }

    const { error, data } = await supabase.functions.invoke('collect_serp_data', {
      body: { query: query.trim() },
    });

    console.log(data);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    router.push(`/serp/${data.serp_search.request_id}`);
  };

  return (
    <>
      <View className="flex-1 bg-white p-2">
        <ScrollView className="flex-1">
          {/* Hero Section */}
          <View className="py-12">
            <Text className="mb-2 text-center text-4xl font-bold">Google SERP Analyzer</Text>
            <Text className="mb-8 text-center text-gray-600">
              Analyze search results for any query
            </Text>
            {/* Search Input */}
            <View className="px-4">
              <View className="flex-row items-center space-x-2 rounded-2xl bg-gray-100 p-2 shadow-sm">
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Enter your search query"
                  placeholderTextColor="#6B7280"
                  className="h-12 flex-1 px-4 text-lg text-gray-900"
                />

                <Pressable
                  onPress={startAnalyzing}
                  className="h-12 items-center justify-center rounded-xl bg-blue-600 px-8">
                  <Text className="text-lg font-semibold text-white">Analyze</Text>
                </Pressable>
              </View>
              <Text className="mt-2 text-center text-sm text-gray-500">
                Example: best programming languages 2024
              </Text>
            </View>

            {/* Recent Searches */}
            <View className="mt-12">
              <Text className="mb-4 px-4 text-lg font-semibold">Recent Searches</Text>
              <View className="divide-y divide-gray-200">
                {(searches || []).map((search) => (
                  <Link key={search.id} href={`/serp/${search.request_id}`} asChild>
                    <Pressable className="flex-row items-center justify-between px-4 py-3">
                      <Text className="text-gray-900">{search.query}</Text>
                      <Text className="text-sm text-gray-500">
                        {new Date(search.created_at).toLocaleDateString()}
                      </Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
