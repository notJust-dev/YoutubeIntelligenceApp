import { View, Text, ScrollView, Image, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { supabase } from '~/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const fetchTrackedChannels = async () => {
  const { data, error } = await supabase.from('yt_channels').select('*').eq('is_tracked', true);

  if (error) {
    throw error;
  }
  return data;
};

const fetchTrackedSearches = async () => {
  const { data, error } = await supabase
    .from('serp_search')
    .select('*, serp_links(*)')
    .eq('is_tracked', true);
  if (error) {
    throw error;
  }
  return data;
};

export default function Home() {
  const {
    data: channels,
    isLoading: channelsLoading,
    error: channelsError,
  } = useQuery({
    queryKey: ['channels', 'tracked'],
    queryFn: fetchTrackedChannels,
  });

  const {
    data: searches,
    isLoading: searchesLoading,
    error: searchesError,
  } = useQuery({
    queryKey: ['serp-tracked'],
    queryFn: fetchTrackedSearches,
  });

  if (channelsLoading || searchesLoading) {
    return <Text>Loading...</Text>;
  }

  if (channelsError || searchesError) {
    return <Text>Error loading dashboard</Text>;
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 16 }}>
      {/* Overview Stats */}
      <View className="flex-row flex-wrap gap-4 p-4">
        <View className="w-[48%] rounded-lg bg-green-50 p-4">
          <Text className="text-sm font-medium text-green-600">Brand Sentiment</Text>
          <Text className="text-2xl font-bold text-green-700">92%</Text>
          <Text className="text-sm text-green-600">↑ 3% from last week</Text>
        </View>
        <View className="w-[48%] rounded-lg bg-blue-50 p-4">
          <Text className="text-sm font-medium text-blue-600">PR Crisis Risk</Text>
          <Text className="text-2xl font-bold text-blue-700">Low</Text>
          <Text className="text-sm text-blue-600">No issues detected</Text>
        </View>
      </View>

      {/* YouTube Section */}
      <View className="flex-1 bg-white p-4">
        <Text className="mb-4 text-2xl font-semibold">YouTube</Text>
        <View className="mb-6 flex-row flex-wrap gap-4">
          <View className="w-[48%] rounded-lg bg-white p-4 shadow-sm">
            <Text className="text-sm font-medium text-gray-600">Comment Sentiment</Text>
            <Text className="text-2xl font-bold text-gray-800">87% Positive</Text>
            <Text className="text-sm text-green-600">↑ 2% this month</Text>
          </View>
          <View className="w-[48%] rounded-lg bg-white p-4 shadow-sm">
            <Text className="text-sm font-medium text-gray-600">Engagement Rate</Text>
            <Text className="text-2xl font-bold text-gray-800">12.3%</Text>
            <Text className="text-sm text-green-600">↑ 1.2% this month</Text>
          </View>
        </View>

        {/* YouTube Channels Section */}
        <View className="divide-y divide-gray-200">
          {channels.map((channel) => (
            <Link href={`/channel/${channel.id}`} key={channel.id} asChild>
              <Pressable className="flex-row items-center justify-between px-4 py-4">
                <View className="flex-row items-center gap-4">
                  <Image
                    source={{ uri: channel.profile_image }}
                    className="h-10 w-10 rounded-full"
                  />
                  <View>
                    <Text className="font-medium">{channel.name}</Text>
                    <Text className="text-sm text-gray-600">
                      {channel.subscribers.toLocaleString()} subscribers
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name={channel.is_tracked ? 'star' : 'star-outline'}
                  size={24}
                  color={channel.is_tracked ? '#FFD700' : '#6B7280'}
                />
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
      {/* SERP Section */}
      <View className="flex-1 bg-white p-4">
        <Text className="mb-4 text-2xl font-semibold">Search Visibility</Text>
        <View className="mb-6 flex-row flex-wrap gap-4">
          <View className="w-[48%] rounded-lg bg-white p-4 shadow-sm">
            <Text className="text-sm font-medium text-gray-600">Average Position</Text>
            <Text className="text-2xl font-bold text-gray-800">3.2</Text>
            <Text className="text-sm text-green-600">↑ 1.4 positions</Text>
          </View>
          <View className="w-[48%] rounded-lg bg-white p-4 shadow-sm">
            <Text className="text-sm font-medium text-gray-600">Visibility Score</Text>
            <Text className="text-2xl font-bold text-gray-800">76%</Text>
            <Text className="text-sm text-green-600">↑ 5% this month</Text>
          </View>
        </View>

        {/* SERP Searches Section */}
        <View className="divide-y divide-gray-200">
          {searches.map((search) => (
            <Link href={`/serp/${search.request_id}`} key={search.request_id} asChild>
              <Pressable className="flex-row items-center justify-between px-4 py-3">
                <View className="flex-1">
                  <Text className="text-gray-900">{search.query}</Text>
                  <Text className="text-sm text-gray-500">
                    {new Date(search.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View className="flex-row items-center gap-4">
                  <Ionicons
                    name={search.is_tracked ? 'star' : 'star-outline'}
                    size={24}
                    color={search.is_tracked ? '#FFD700' : '#6B7280'}
                  />
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
