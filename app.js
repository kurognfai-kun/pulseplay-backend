// Replace with your Render backend URL
const BACKEND_URL = "https://pulseplay-backend.onrender.com";

// Spinner
function showSpinner(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '<div class="spinner"></div>';
}

// Render cards
function renderCards(containerId, cards) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  cards.forEach(card => container.appendChild(card));
}

// Twitch fetch
async function loadTwitch() {
  showSpinner("twitch-container");
  try {
    const res = await fetch(`${BACKEND_URL}/api/twitch`);
    const data = await res.json();

    const cards = data.data.map(stream => {
      const card = document.createElement("div");
      card.className = "card";

      const imgUrl = stream.box_art_url.replace("{width}", "320").replace("{height}", "180");
      const twitchLink = `https://www.twitch.tv/directory/game/${encodeURIComponent(stream.name)}`;

      card.innerHTML = `
        <img src="${imgUrl}" alt="${stream.name}">
        <h3>${stream.name}</h3>
        <p>Live Viewers: ${stream.viewers || "N/A"}</p>
        <a href="${twitchLink}" target="_blank" rel="noopener noreferrer" class="watch-btn">⚡ Watch Now</a>
      `;
      return card;
    });

    renderCards("twitch-container", cards);
  } catch (err) {
    console.error("Error loading Twitch:", err);
  }
}

// YouTube fetch
async function loadYouTube() {
  showSpinner("youtube-container");
  try {
    const res = await fetch(`${BACKEND_URL}/api/youtube`);
    const data = await res.json();

    const cards = data.items.map(video => {
      const card = document.createElement("div");
      card.className = "card";

      const thumbnail = video.snippet.thumbnails.medium.url;
      const title = video.snippet.title;
      const channel = video.snippet.channelTitle;
      const views = video.statistics ? Number(video.statistics.viewCount).toLocaleString() : "N/A";
      const videoLink = `https://www.youtube.com/watch?v=${video.id}`;

      card.innerHTML = `
        <img src="${thumbnail}" alt="${title}">
        <h3>${title}</h3>
        <p>Channel: ${channel}</p>
        <p>Views: ${views}</p>
        <a href="${videoLink}" target="_blank" rel="noopener noreferrer" class="watch-btn">⚡ Watch Now</a>
      `;
      return card;
    });

    renderCards("youtube-container", cards);
  } catch (err) {
    console.error("Error loading YouTube:", err);
  }
}

// Initial load
loadTwitch();
loadYouTube();

// Auto-refresh every 60 seconds
setInterval(() => {
  console.log("🔄 Refreshing Twitch & YouTube data...");
  loadTwitch();
  loadYouTube();
}, 60000);
