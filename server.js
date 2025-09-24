require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: process.env.CACHE_TTL || 120 });

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

/* ===== Twitch API ===== */
app.get('/api/twitch', async (req, res) => {
  const cached = cache.get('twitch');
  if (cached) return res.json(cached);

  try {
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
      { method: 'POST' }
    );
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const response = await fetch('https://api.twitch.tv/helix/streams?first=6', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();

    const streams = data.data.map(stream => ({
      name: stream.user_name,
      game: stream.game_name,
      thumbnail: stream.thumbnail_url.replace('{width}', '250').replace('{height}', '140'),
      url: `https://www.twitch.tv/${stream.user_login}`
    }));

    cache.set('twitch', streams);
    res.json(streams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Twitch API error' });
  }
});

/* ===== YouTube API ===== */
app.get('/api/youtube', async (req, res) => {
  const cached = cache.get('youtube');
  if (cached) return res.json(cached);

  try {
    const CHANNEL_ID = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // replace with your channel
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=6&order=viewCount&type=video&key=${process.env.YOUTUBE_API_KEY}`
    );
    const data = await response.json();

    const videos = data.items.map(video => ({
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${video.id.videoId}`
    }));

    cache.set('youtube', videos);
    res.json(videos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'YouTube API error' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
