import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollView, View, Text, Image, Button } from 'react-native';
import { supabase } from '~/lib/supabase';

const fetchVideo = async (id: string) => {
  const { data, error } = await supabase
    .from('yt_videos')
    .select('*, yt_channels(*)')
    .eq('id', id)
    .single();
  if (error) {
    throw error;
  }
  return data;
};

export default function Video() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const {
    data: video,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['video', id],
    queryFn: () => fetchVideo(id),
  });

  const getCommentsAnalysis = async () => {
    const { data, error } = await supabase.functions.invoke('ai_comments_analysis', {
      body: { video_id: id },
    });
    queryClient.invalidateQueries({ queryKey: ['video', id] });
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (error) {
    return <Text>Error: {error.message}</Text>;
  }

  return (
    <ScrollView className="flex-1">
      <Stack.Screen options={{ title: video.yt_channels.name }} />

      {/* Video Preview/Player */}
      <Image source={{ uri: video.preview_image }} className="h-56 w-full object-cover" />

      <View className="p-4">
        {/* Video Info */}
        <Text className="text-2xl font-bold">{video.title}</Text>

        <View className="mt-4 flex-row justify-between">
          <Text className="text-gray-600">{video.views.toLocaleString()} views</Text>
          <Text className="text-gray-600">{new Date(video.date_posted).toLocaleDateString()}</Text>
        </View>

        {/* Channel Info */}
        <View className="mt-6 flex-row items-center gap-4">
          <Image
            source={{ uri: video.yt_channels.profile_image }}
            className="h-12 w-12 rounded-full"
          />
          <View>
            <Text className="font-semibold">{video.yt_channels.name}</Text>
            <Text className="text-gray-600">
              {video.yt_channels.subscribers.toLocaleString()} subscribers
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text className="mt-6 text-gray-800" numberOfLines={3}>
          {video.description}
        </Text>

        {/* Stats */}
        <View className="mt-6 flex-row gap-4">
          <Text className="text-gray-600">{video.likes.toLocaleString()} likes</Text>
        </View>

        {/* AI Analysis Section */}
        <View className="mt-6 rounded-lg bg-gray-50 p-4">
          <Text className="mb-3 text-lg font-semibold">AI Summary</Text>
          <Text className="leading-relaxed text-gray-800">{video.ai_summary}</Text>

          {/* Key Topics */}
          <View className="mt-4">
            <Text className="mb-2 text-lg font-semibold">Key Topics</Text>
            <View className="flex-row flex-wrap gap-2">
              {video.ai_topics?.map((topic: string) => (
                <View key={topic} className="rounded-full bg-blue-100 px-3 py-1">
                  <Text className="text-blue-800">{topic}</Text>
                </View>
              ))}
            </View>
          </View>

          {video.comments_sentiment ? (
            <View className="mt-4">
              <Text className="mb-2 text-lg font-semibold">Comments Analysis</Text>
              <Text className="font-medium">Sentiment: {video.comments_sentiment}</Text>
              <Text className="mt-1 text-gray-600">Score: {video.comments_sentiment_score}</Text>
              <Text className="mt-2">{video.comments_sentiment_explanation}</Text>

              <Text className="mb-2 mt-4 text-lg font-semibold">Comment Topics</Text>
              <View className="flex-row flex-wrap gap-2">
                {video.comments_topics?.map((topic: string) => (
                  <View key={topic} className="rounded-full bg-green-100 px-3 py-1">
                    <Text className="text-green-800">{topic}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Button title="Generate AI Analysis" onPress={getCommentsAnalysis} className="mt-4" />
          )}
        </View>
      </View>
    </ScrollView>
  );
}
