const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const dotenv = require("dotenv");
const redis = require("redis");
const cors = require("cors");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
  })
);

// Configurar Redis
const redisUrl = process.env.REDIS_URL;
const redisClient = redis.createClient({ url: redisUrl });

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

(async () => {
  try {
    await redisClient.connect();
    console.log("Connected to Redis");
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
  }
})();

app.use(express.json());

const analyzeRisk = (user) => {
  let riskScore = 0;

  if (user.vacBanned) return 99.9;
  if (user.isPrivate) return 99.9;
  if (user.recentGames.length === 0) return 99.9;

  if (user.commentCheck) riskScore += 50;

  const csgo = user.recentGames.find((game) => game.id === "730");
  if (csgo && parseFloat(csgo.hours) > 1000) riskScore += 10;
  if (csgo && parseFloat(csgo.hours) > 500) riskScore += 20;

  if (user.friends < 50) riskScore += 10;
  if (user.level < 10) riskScore += 10;

  const riskPercentage = Math.min(100, riskScore);
  return riskPercentage;
};

const checkCache = async (usernames) => {
  const cachedProfiles = {};
  for (const username of usernames) {
    try {
      const cachedProfile = await redisClient.get(username);
      if (cachedProfile) {
        const parsedProfile = JSON.parse(cachedProfile);
        cachedProfiles[username] = parsedProfile.riskScore;
      }
    } catch (redisErr) {
      console.error(`Error fetching from Redis for ${username}:`, redisErr);
    }
  }
  return cachedProfiles;
};

const fetchUserProfile = async (username) => {
  const user = {};
  try {
    const { data: html } = await axios.get(
      `https://steamcommunity.com/profiles/${username}/`
    );
    const $ = cheerio.load(html);

    const isPrivate = $(".profile_private_info").length > 0;
    user.isPrivate = isPrivate;

    if (isPrivate) {
      user.level = null;
      user.friends = null;
      user.recentGames = [];
      user.vacBanned = null;
    } else {
      user.level = parseInt($(".friendPlayerLevelNum").text().trim(), 10) || 0;
      user.friends =
        parseInt(
          $(".profile_friend_links .profile_count_link_total").text().trim(),
          10
        ) || 0;
      user.recentGames = [];
      $(".recent_game").each((i, element) => {
        const game = {
          id: $(element).find("a").attr("href").split("/").pop(),
          title: $(element).find(".game_name a").text().trim(),
          hours: $(element)
            .find(".game_info_details")
            .text()
            .split(" hrs on record")[0]
            .trim(),
        };
        user.recentGames.push(game);
      });

      if (user.recentGames.length === 0) {
        user.isPrivate = true;
      }

      const banStatus = $(".profile_ban_status .profile_ban").text().trim();
      user.vacBanned = banStatus.includes("banimento VAC");

      // Buscar comentários
      const commentsUrl = `https://steamcommunity.com/profiles/${username}/allcomments`;
      const { data: commentsHtml } = await axios.get(commentsUrl);
      const $comments = cheerio.load(commentsHtml);

      user.comments = [];
      $comments(".commentthread_comment_text").each((i, element) => {
        const commentText = $comments(element).text().trim();
        user.comments.push(commentText);
      });

      user.commentCheck = user.comments.some((comment) =>
        /cheater|wall|xitado|XITER|xiter|Denúncia/i.test(comment)
      );
    }
    console.log(user);
    user.riskScore = analyzeRisk(user);

    // Armazenar no cache do Redis
    await redisClient.set(username, JSON.stringify(user), { EX: 604800 });
  } catch (error) {
    console.error(`Error fetching profile for ${username}:`, error);
  }
  return { username, riskScore: user.riskScore };
};

// Função para calcular risco da lobby usando exponential smoothing
const lobbyRiskExponential = (players) => {
  if (players.length === 0) return 100;

  const totalExponentialRisk = players.reduce(
    (sum, player) => sum + Math.exp(player.riskScore / 10),
    0
  );

  return (Math.log(totalExponentialRisk / players.length) * 10).toFixed(2);
};

app.post("/getUserProfiles", async (req, res) => {
  const { usernames } = req.body;

  if (!Array.isArray(usernames) || usernames.length === 0) {
    return res
      .status(400)
      .json({ error: "Usernames must be a non-empty array" });
  }

  try {
    const cachedProfiles = await checkCache(usernames);
    const usernamesToFetch = usernames.filter(
      (username) => !cachedProfiles[username]
    );

    let fetchedProfiles = [];
    if (usernamesToFetch.length > 0) {
      fetchedProfiles = await Promise.all(
        usernamesToFetch.map(async (username) => {
          try {
            return await fetchUserProfile(username);
          } catch (err) {
            console.error(`Error fetching profile for ${username}:`, err);
            return null;
          }
        })
      );

      fetchedProfiles = fetchedProfiles.filter((result) => result !== null);
    }

    const allProfiles = {
      ...cachedProfiles,
      ...Object.fromEntries(
        fetchedProfiles.map((profile) => [profile.username, profile.riskScore])
      ),
    };

    const lobbyRiskScore = lobbyRiskExponential(
      Object.values(allProfiles).map((riskScore) => ({ riskScore }))
    );
    res.json({ profiles: allProfiles, lobbyRisk: parseFloat(lobbyRiskScore) });
  } catch (error) {
    console.error(`Failed to fetch user profiles:`, error);
    res.status(500).json({ error: "Failed to fetch user profiles" });
  }
});

app.listen(PORT, () => {
  console.log(`Service running on port ${PORT}`);
});
