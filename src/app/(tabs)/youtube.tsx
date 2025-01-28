import { useQuery } from '@tanstack/react-query';
import { Stack, Link, router } from 'expo-router';
import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Container } from '~/components/Container';
import { YT_CHANNELS_DATASET_ID } from '~/constants';
import { supabase } from '~/lib/supabase';

const POPULAR_CHANNELS = [
  { name: 'notJustDev', id: 'UCYSa_YLoJokZAwHhlwJntIA' },
  { name: 'PewDiePie', id: 'UC-lHJZR3Gqxm24_Vd_AJ5Yw' },
];

const fetchChannels = async () => {
  const { data, error } = await supabase
    .from('yt_channels')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    throw error;
  }
  return data;
};

export default function Home() {
  const [url, setUrl] = useState('');

  const {
    data: channels,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['channels'],
    queryFn: () => fetchChannels(),
  });

  const startAnalyzing = async () => {
    if (!url) {
      return;
    }
    // check if data about this channel already exists
    const { data: channels, error: channelsError } = await supabase
      .from('yt_channels')
      .select('*')
      .eq('url', url);

    if (channels && channels.length > 0) {
      router.push(`/channel/${channels[0].id}`);
      return;
    }

    const { error, data } = await supabase.functions.invoke('trigger_collection_api', {
      body: { input: [{ url }], dataset_id: YT_CHANNELS_DATASET_ID },
    });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    router.push(`/job/${data.id}`);
  };

  return (
    <>
      <View className="flex-1 bg-white p-2">
        <ScrollView className="flex-1">
          {/* Hero Section */}
          <View className="py-12">
            <Text className="mb-2 text-center text-4xl font-bold">YouTube Channel Analyzer</Text>
            <Text className="mb-8 text-center text-gray-600">
              Discover insights about any YouTube channel
            </Text>
            {/* Search Input */}
            <View className="px-4">
              <View className="flex-row items-center space-x-2 rounded-2xl bg-gray-100 p-2 shadow-sm">
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder="Paste YouTube channel URL"
                  placeholderTextColor="#6B7280"
                  className="h-12 flex-1 px-4 text-lg text-gray-900"
                />

                <Pressable
                  onPress={startAnalyzing}
                  className="h-12 items-center justify-center rounded-xl bg-red-600 px-8">
                  <Text className="text-lg font-semibold text-white">Analyze</Text>
                </Pressable>
              </View>
              <Text className="mt-2 text-center text-sm text-gray-500">
                Example: https://youtube.com/@mkbhd
              </Text>
            </View>
            {/* Popular Channels */}
            <View className="mt-12">
              <Text className="mb-4 px-4 text-lg font-semibold">Popular Channels</Text>
              <View className="flex-row flex-wrap gap-2 px-4">
                {POPULAR_CHANNELS.map((channel) => (
                  <Link key={channel.id} href={`/channel/${channel.id}`} asChild>
                    <Pressable className="rounded-full bg-gray-100 px-4 py-2">
                      <Text className="text-gray-900">{channel.name}</Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
            </View>
            {/* Recent Searches */}
            <View className="mt-12">
              <Text className="mb-4 px-4 text-lg font-semibold">Recent Searches</Text>
              <View className="divide-y divide-gray-200">
                {(channels || []).map((channel) => (
                  <Link key={channel.id} href={`/channel/${channel.id}`} asChild>
                    <Pressable className="flex-row items-center justify-between px-4 py-4">
                      <View className="flex-row items-center gap-4">
                        <Image
                          source={{ uri: channel.profile_image }}
                          className="h-10 w-10 rounded-full"
                        />
                        <View>
                          <Text className="font-medium">{channel.name}</Text>
                          <Text className="text-sm text-gray-600">
                            {channel.subscribers} subscribers
                          </Text>
                        </View>
                      </View>
                      
                      <Ionicons 
                        name={channel.is_tracked ? "star" : "star-outline"} 
                        size={24} 
                        color={channel.is_tracked ? "#FFD700" : "#6B7280"} 
                      />
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
