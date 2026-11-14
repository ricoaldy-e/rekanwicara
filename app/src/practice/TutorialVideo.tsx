import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { VideoReference } from '../api/types';
import { getCompanionSession } from '../auth/companion';
import { BigButton, InfoNote } from '../components';
import { getClient } from '../data/supabase';
import { radius } from '../theme';

function Player({ uri, onError }: { uri: string; onError(): void }) {
  const player = useVideoPlayer(uri, (value) => { value.loop = false; value.play(); });
  useEffect(() => {
    const listener = player.addListener('statusChange', (event) => { if (event.status === 'error') onError(); });
    return () => listener.remove();
  }, [player, onError]);
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />;
}

export function TutorialVideo({ video, ownerId }: { video: VideoReference | undefined; ownerId: string }) {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generation, setGeneration] = useState(0);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  if (!video?.available) return <InfoNote text="Video contoh belum tersedia. Ikuti panduan teks untuk berlatih." />;
  const open = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await getCompanionSession();
      if (session?.user.id !== ownerId) throw new Error();
      const allowed = video.bucket === 'rekan-wicara-tutorials' && video.path.startsWith('default/level-1/') ||
        video.bucket === 'default-videos' && video.path.startsWith('level-1/');
      if (!allowed || video.path.split('/').some((part) => part === '..' || part === '.') || video.path.includes('\\')) throw new Error();
      const result = await getClient().storage.from(video.bucket).createSignedUrl(video.path, 300);
      if (result.error || !result.data?.signedUrl || (await getCompanionSession())?.user.id !== ownerId) throw new Error();
      if (active.current) { setUri(result.data.signedUrl); setGeneration((value) => value + 1); }
    } catch {
      if (active.current) setError('Video belum dapat dibuka. Periksa koneksi atau coba perbarui akses video.');
    } finally {
      if (active.current) setLoading(false);
    }
  };
  return <View>
    {uri ? <Player key={generation} uri={uri} onError={() => setError('Video belum dapat diputar. Coba perbarui akses video.')} /> : null}
    {error ? <InfoNote tone="warning" text={error} /> : null}
    <BigButton label={loading ? 'Membuka video…' : uri || error ? 'Perbarui akses video' : 'Putar video contoh'}
      icon="play" variant="secondary" disabled={loading} onPress={() => void open()} />
  </View>;
}

const styles = StyleSheet.create({ video: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.lg } });
