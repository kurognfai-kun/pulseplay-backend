require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
app.use(cors()); // configure origins if you want to restrict
app.use(express.json());

const cacheTtl = parseInt(process.env.CACHE_TTL || '120', 10); // seconds
const cache = new NodeCache({ stdTTL: cacheTtl, checkperiod: cacheTtl / 2 });

// --- Twitch helper: get app access token ---
let twitchAppToken = null;
let twitchTokenExpiry = 0;

async function getTwitchAppToken() {
  const now = Date.now();
  if (twitchAppToken && now < twitchTokenExpiry - 60000) { // reuse while still valid (with 60s buffer)
    return twitchAppToken;
  }
  const clientId = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error('Twitch client id/secret not set in env');

  const resp = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
    params: {
      client_id: clientId,
      client_secret: secret,
      grant_type: 'client_credentials'
    }
  });
  twitchAppToken = resp.data.access_token;
  // token validity in seconds
  const expiresIn = resp.data.expires_in || 3600;
  twitchTokenExpiry = Date.now() + expiresIn * 1000;
  return twitchAppToken;
}

// --- /api/trending-games : Twitch Top Games ---
app.get('/api/trending-games', async (req, res) => {
  try {
    const cached = cache.get('trending-games');
    if (cached) return res.json({ source: 'cache', data: cached });

    const token = await getTwitchAppToken();
    const clientId = process.env.TWITCH_CLIENT_ID;

    // Get top games (Twitch Helix API). We will request top 6 games then optionally get live viewer counts.
    const topGamesResp = await axios.get('https://api.twitch.tv/helix/games/top', {
      headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}` },
      params: { first: 6 }
    });

    const games = topGamesResp.data.data || [];

    // For each game we will fetch the top live stream count (optional). To keep requests small, we can skip this
    // or do a single streams call for each game name (here we perform a single query to get top streams and group).
    // Simpler approach: for each game id, fetch a top stream to get viewer_count (1 call per game).
    const enhanced = await Promise.all(games.map(async (g) => {
      // Try to fetch one stream for this game to get approximate viewer count
      try {
        const streamsResp = await axios.get('https://api.twitch.tv/helix/streams', {
          headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${token}` },
          params: { game_id: g.id, first: 1 }
        });
        const stream = (streamsResp.data.data && streamsResp.data.data[0]) || null;
        return {
          id: g.id,
          name: g.name,
          box_art_url: g.box_art_url.replace('{width}', '285').replace('{height}', '380'),
          viewer_count: stream ? stream.viewer_count : null,
          top_streamer: stream ? { user_name: stream.user_name, title: stream.title } : null
        };
      } catch (err) {
        return {
          id: g.id,
          name: g.name,
          box_art_url: g.box_art_url.replace('{width}', '285').replace('{height}', '380'),
          viewer_count: null,
          top_streamer: null
        };
      }
    }));

    cache.set('trending-games', enhanced);
    return res.json({ source: 'twitch', data: enhanced });
  } catch (err) {
    console.error('trending-games error', err.message || err);
    res.status(500).json({ error: 'Failed to get trending games', details: err.message });
  }
});

// --- /api/featured-video : YouTube -- get most recent video for a channel or search -->
// You can either provide YOUTUBE_CHANNEL_ID or a search query (q param)
app.get('/api/featured-video', async (req, res) => {
  try {
    const cached = cache.get('featured-video');
    if (cached) return res.json({ source: 'cache', data: cached });

    const key = process.env.YOUTUBE_API_KEY;
    if (!key) throw new Error('YouTube API key not set in env');

    const channelId = req.query.channelId; // optional
    const q = req.query.q || 'esports highlights';

    let video = null;

    if (channelId) {
      // fetch latest video from channel uploads (use search.list ordered by date)
      const url = 'https://www.googleapis.com/youtube/v3/search';
      const resp = await axios.get(url, {
        params: {
          key,
          channelId,
          part: 'snippet',
          order: 'date',
          type: 'video',
          maxResults: 1
        }
      });
      const item = resp.data.items && resp.data.items[0];
      if (item) {
        video = {
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          publishedAt: item.snippet.publishedAt
        };
      }
    } else {
      // fallback: use search query to find most relevant recent video
      const url = 'https://www.googleapis.com/youtube/v3/search';
      const resp = await axios.get(url, {
        params: {
          key,
          part: 'snippet',
          q,
          type: 'video',
          order: 'relevance',
          maxResults: 1
        }
      });
      const item = resp.data.items && resp.data.items[0];
      if (item) {
        video = {
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          publishedAt: item.snippet.publishedAt
        };
      }
    }

    if (!video) return res.status(404).json({ error: 'No video found' });

    cache.set('featured-video', video);
    return res.json({ source: 'youtube', data: video });
  } catch (err) {
    console.error('featured-video error', err.message || err);
    res.status(500).json({ error: 'Failed to get featured video', details: err.message });
  }
});

// --- health ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- start server ---
const port = parseInt(process.env.PORT || '3000', 10);
app.listen(port, () => {
  console.log(`PulsePlay API running on port ${port}`);
});
