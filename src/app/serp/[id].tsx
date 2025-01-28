import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { View, Text, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { supabase } from '~/lib/supabase';
import { Button } from '~/components/Button';

const fetchSerpData = async (id: string) => {
  const { data, error } = await supabase
    .from('serp_search')
    .select(
      `
      *,
      serp_links(*)
    `
    )
    .eq('request_id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export default function SerpResults() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const toggleTracking = async () => {
    const { error } = await supabase
      .from('serp_search')
      .update({ is_tracked: !data.is_tracked })
      .eq('request_id', id);

    if (error) {
      Alert.alert('Error', 'Failed to update tracking status');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['serp', id] });
    queryClient.invalidateQueries({ queryKey: ['serp-tracked'] });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['serp', id],
    queryFn: () => fetchSerpData(id),
  });

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (error) {
    return <Text>Error: {error.message}</Text>;
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <Stack.Screen options={{ title: `Search Results: ${data.query}` }} />

      <View className="p-4">
        {/* Search Info */}
        <View className="mb-6 rounded-lg bg-gray-50 p-4">
          <Text className="text-lg font-bold">{data.query}</Text>
          <Text className="text-gray-600">Search Engine: {data.search_engine}</Text>
          <Text className="text-gray-600">
            Date: {new Date(data.created_at).toLocaleDateString()}
          </Text>
          <Button
            title={data.is_tracked ? 'Untrack Search' : 'Track Search'}
            onPress={toggleTracking}
            className="mt-2"
          />
        </View>

        {/* Results List */}
        <Text className="mb-4 text-xl font-bold">Search Results</Text>
        {data.serp_links.map((link) => (
          <Pressable
            key={link.id}
            className="mb-4 rounded-lg border border-gray-200 p-4"
            onPress={() => Linking.openURL(link.link)}>
            <Text className="text-lg font-semibold text-blue-600">{link.title}</Text>
            <Text className="mt-1 text-gray-600">{link.description}</Text>
            <View className="mt-2 flex-row justify-between">
              <Text className="text-sm text-gray-500">Global Rank: {link.global_rank}</Text>
              <Text className="text-sm text-gray-500">{new URL(link.link).hostname}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
