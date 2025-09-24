require('dotenv').config();
const express = require('express');
const NodeCache = require('node-cache');

const app = express();

// ===== NodeCache setup =====
const CACHE_TTL = Number(process.env.CACHE_TTL) || 120;
const cache = new NodeCache({ stdTTL: CACHE_TTL });

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

// ===== Twitch API =====
async function getTwitchToken() {
  const cachedToken = cache.get('twitch_token');
  if (cachedToken) return cachedToken;

  const tokenRes = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Failed to get Twitch access token');

  // Cache token for its expiration time
  cache.set('twitch_token', tokenData.access_token, tokenData.expires_in || 3600);
  return tokenData.access_token;
}

app.get('/api/twitch', async (req, res) => {
  const cached = cache.get('twitch_streams');
  if (cached) return res.json(cached);

  try {
    const accessToken = await getTwitchToken();

    const response = await fetch('https://api.twitch.tv/helix/streams?first=6', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    const streams = (data.data || []).map(stream => ({
      name: stream.user_name,
      game: stream.game_name,
      thumbnail: stream.thumbnail_url.replace('{width}', '250').replace('{height}', '140'),
      url: `https://www.twitch.tv/${stream.user_login}`
    }));

    cache.set('twitch_streams', streams, CACHE_TTL);
    res.json(streams);
  } catch (err) {
    console.error('Twitch API error:', err);
    res.status(500).json({ error: 'Twitch API error' });
  }
});

// ===== YouTube API =====
app.get('/api/youtube', async (req, res) => {
  const cached = cache.get('youtube_videos');
  if (cached) return res.json(cached);

  try {
    const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UC_x5XG1OV2P6uZZ5FSM9Ttw';
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=6&order=viewCount&type=video&key=${process.env.YOUTUBE_API_KEY}`
    );

    const data = await response.json();
    const items = data.items || [];
    const videos = items.map(video => ({
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails?.medium?.url || '',
      url: `https://www.youtube.com/watch?v=${video.id.videoId}`
    }));

    cache.set('youtube_videos', videos, CACHE_TTL);
    res.json(videos);
  } catch (err) {
    console.error('YouTube API error:', err);
    res.status(500).json({ error: 'YouTube API error' });
  }
});

// ===== Featured Clips (optional) =====
app.get('/api/featured', async (req, res) => {
  const cached = cache.get('featured_clips');
  if (cached) return res.json(cached);

  try {
    // Replace with your own featured clips logic or JSON file
    const clips = [
      { embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { embedUrl: 'https://www.youtube.com/embed/9bZkp7q19f0' }
    ];

    cache.set('featured_clips', clips, CACHE_TTL);
    res.json(clips);
  } catch (err) {
    console.error('Featured clips error:', err);
    res.status(500).json({ error: 'Failed to load featured clips' });
  }
});

// ===== Start server =====
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
