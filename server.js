import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // load .env file

const app = express();

// Twitch API
app.get("/api/twitch", async (req, res) => {
  try {
    const authRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    });

    const { access_token } = await authRes.json();

    const twitchRes = await fetch("https://api.twitch.tv/helix/games/top", {
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${access_token}`,
      },
    });

    const data = await twitchRes.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Twitch API failed" });
  }
});

// YouTube API
app.get("/api/youtube", async (req, res) => {
  try {
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&videoCategoryId=20&key=${process.env.YOUTUBE_API_KEY}`
    );
    const data = await ytRes.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "YouTube API failed" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
