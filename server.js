// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ===== Twitch API Setup =====
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
let twitchToken = null;

// Get Twitch App Access Token
async function getTwitchToken() {
  if (twitchToken) return twitchToken; // simple cache

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  );
  const data = await res.json();
  twitchToken = data.access_token;
  return twitchToken;
}

// ===== Routes =====

// Twitch live streams
app.get("/api/twitch", async (req, res) => {
  try {
    const token = await getTwitchToken();
    const response = await fetch(
      "https://api.twitch.tv/helix/streams?first=6", // adjust number of streams
      {
        headers: {
          "Client-ID": TWITCH_CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();

    const streams = data.data.map((stream) => ({
      name: stream.user_name,
      game: stream.game_name,
      thumbnail: stream.thumbnail_url
        .replace("{width}", "320")
        .replace("{height}", "180"),
      url: `https://twitch.tv/${stream.user_login}`,
    }));

    res.json(streams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Twitch streams" });
  }
});

// YouTube trending
app.get("/api/youtube", async (req, res) => {
  try {
    const YT_API_KEY = process.env.YOUTUBE_API_KEY;
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=6&regionCode=US&key=${YT_API_KEY}`
    );
    const data = await response.json();

    const videos = data.items.map((video) => ({
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${video.id}`,
    }));

    res.json(videos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch YouTube videos" });
  }
});

// Featured clips (custom placeholder)
app.get("/api/featured", (req, res) => {
  const clips = [
    {
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
    {
      embedUrl: "https://player.twitch.tv/?video=v123456789&parent=yourdomain.com",
    },
  ];
  res.json(clips);
});

// Root
app.get("/", (req, res) => {
  res.send("PulsePlay Backend API is running ⚡");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
