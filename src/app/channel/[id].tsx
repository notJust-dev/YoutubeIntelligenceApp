import { useQuery } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { View, Text, Image, ScrollView, Alert, Pressable } from 'react-native';
import { Button } from '~/components/Button';
import { YT_VIDEOS_DATASET_ID } from '~/constants';
import { supabase } from '~/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const fetchChannel = async (id: string) => {
  const { data, error } = await supabase.from('yt_channels').select('*').eq('id', id).single();
  if (error) {
    throw error;
  }
  return data;
};

const fetchVideos = async (channelId: string) => {
  const { data, error } = await supabase.from('yt_videos').select('*').eq('youtuber_id', channelId);
  if (error) {
    throw error;
  }
  return data;
};

export default function Channel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const toggleTracking = async () => {
    const { error } = await supabase
      .from('yt_channels')
      .update({ is_tracked: !channel.is_tracked })
      .eq('id', id);

    if (error) {
      Alert.alert('Error', 'Failed to update tracking status');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['channel', id] });
    queryClient.invalidateQueries({ queryKey: ['channels'] });
  };

  const {
    data: channel,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['channel', id],
    queryFn: () => fetchChannel(id),
  });

  const {
    data: videos,
    isLoading: videosLoading,
    error: videosError,
  } = useQuery({
    queryKey: ['videos', id],
    queryFn: () => fetchVideos(id),
  });

  const collectVideos = async () => {
    const { data, error } = await supabase.functions.invoke('trigger_collection_api', {
      body: {
        input: [{ url: channel.url, num_of_posts: 2, order_by: 'Latest' }],
        dataset_id: YT_VIDEOS_DATASET_ID,
        extra_params: 'type=discover_new&discover_by=url',
      },
    });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    console.log(data);

    // router.push(`/job/${data.id}`);
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (error) {
    return <Text>Error: {error.message}</Text>;
  }

  return (
    <ScrollView className="flex-1">
      <Stack.Screen options={{ title: channel.name }} />
      {/* Banner Image */}
      <Image source={{ uri: channel.banner_img }} className="h-40 w-full object-cover" />

      <View className="p-4">
        {/* Profile Section */}
        <View className="flex-row items-center gap-4">
          <Image source={{ uri: channel.profile_image }} className="h-20 w-20 rounded-full" />
          <View className="flex-1">
            <Text className="text-2xl font-bold">{channel.name}</Text>
            <Text className="text-gray-600">{channel.handle}</Text>
            <View className="mt-2 flex-row gap-4">
              <Text className="text-gray-600">
                {channel.subscribers.toLocaleString()} subscribers
              </Text>
              <Text className="text-gray-600">{channel.videos_count} videos</Text>
            </View>
            <Button
              title={channel.is_tracked ? 'Untrack Channel' : 'Track Channel'}
              onPress={toggleTracking}
              className="mt-2"
            />
          </View>
        </View>

        {/* Description */}
        <Text className="mt-6 text-gray-800" numberOfLines={5}>
          {channel.Description}
        </Text>

        {/* Stats Grid */}
        <View className="mt-6 flex-row justify-between rounded-lg bg-gray-50 p-4">
          <View className="items-center">
            <Text className="text-xl font-bold">{(channel.views / 1000000).toFixed(1)}M</Text>
            <Text className="text-gray-600">Total Views</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold">
              {new Date(channel.created_date).getFullYear()}
            </Text>
            <Text className="text-gray-600">Joined</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold">{channel.location}</Text>
            <Text className="text-gray-600">Location</Text>
          </View>
        </View>

        <Text className="mb-5 mt-6 text-gray-800">Videos</Text>
        {/* <Button title="Collect Videos" onPress={collectVideos} /> */}
        {(videos || []).map((video) => (
          <Link href={`/video/${video.id}`} asChild key={video.id}>
            <Pressable className="my-4 rounded-lg border border-gray-200 p-4">
              <Image
                source={{ uri: video.preview_image }}
                className="h-48 w-full rounded-lg object-cover"
              />
              <Text className="mt-2 text-lg font-semibold">{video.title}</Text>
              <View className="mt-2 flex-row justify-between">
                <Text className="text-gray-600">{video.views.toLocaleString()} views</Text>
                <Text className="text-gray-600">
                  {new Date(video.date_posted).toLocaleDateString()}
                </Text>
              </View>
              <View className="mt-2 flex-row gap-4">
                <Text className="text-gray-600">{video.likes.toLocaleString()} likes</Text>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
