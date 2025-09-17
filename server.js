const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// Twitch API
app.get("/api/twitch", async (req, res) => {
  try {
    const tokenRes = await axios.post(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
    );
    const token = tokenRes.data.access_token;

    // Example: Top 5 games live streams
    const topStreamsRes = await axios.get(
      `https://api.twitch.tv/helix/streams?first=5`,
      {
        headers: {
          "Client-ID": process.env.TWITCH_CLIENT_ID,
          Authorization: `Bearer ${token}`
        }
      }
    );

    const streams = topStreamsRes.data.data.map(stream => ({
      id: stream.id,
      name: stream.game_name,
      viewers: stream.viewer_count,
      box_art_url: stream.thumbnail_url
    }));

    res.json({ data: streams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Twitch data" });
  }
});

// YouTube API
app.get("/api/youtube", async (req, res) => {
  try {
    const ytRes = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&maxResults=5&regionCode=US&key=${process.env.YOUTUBE_API_KEY}`
    );
    res.json(ytRes.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch YouTube data" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
