import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { VideoReference } from '../api/types';
import { BigButton, InfoNote } from '../components';
import { ClipPreview } from '../recording/ClipPreview';
import { radius } from '../theme';
import { manualError, signedVideo } from './service';

function RemotePlayer({ uri, onError }: { uri: string; onError(): void }) {
  const player = useVideoPlayer(uri, (value) => { value.loop = false; });
  useEffect(() => {
    const listener = player.addListener('statusChange', (event) => {
      if (event.status === 'error') onError();
    });
    return () => listener.remove();
  }, [player, onError]);
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />;
}

export function VideoPreview({ video, localUri, ownerId }: { video: VideoReference | null; localUri: string | null; ownerId: string }) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generation, setGeneration] = useState(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  if (localUri) return <ClipPreview key={localUri} uri={localUri} />;
  if (!video) return <InfoNote text="Belum ada rekaman video." />;
  if (!video.available) return <InfoNote tone="warning" text="Video belum tersedia di Storage. Rekam video lalu simpan kembali." />;
  const open = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await signedVideo(video, ownerId);
      if (mounted.current) { setUri(next); setGeneration((value) => value + 1); }
    } catch (failure) {
      if (mounted.current) setError(manualError(failure));
    } finally {
      if (mounted.current) setLoading(false);
    }
  };
  return <View>
    {uri ? <RemotePlayer key={generation} uri={uri} onError={() => setError('Video belum dapat diputar atau aksesnya kedaluwarsa. Perbarui akses video.')} /> : null}
    {error ? <InfoNote tone="warning" text={error} /> : null}
    <BigButton label={loading ? 'Membuka video…' : uri || error ? 'Perbarui akses video' : 'Preview video tersimpan'}
      icon="play" variant="secondary" disabled={loading} onPress={() => void open()} />
  </View>;
}

const styles = StyleSheet.create({ video: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.lg } });
