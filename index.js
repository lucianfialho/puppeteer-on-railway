const express = require("express");
const puppeteerExtra = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");
const dotenv = require("dotenv");
const redis = require("redis");
const util = require("util");

dotenv.config();
puppeteerExtra.use(stealthPlugin());

const app = express();
const PORT = 3000;

// Configurar Redis
const redisClient = redis.createClient();
const getAsync = util.promisify(redisClient.get).bind(redisClient);
const setAsync = util.promisify(redisClient.set).bind(redisClient);

app.use(express.json());

const getUserProfile = async (username) => {
  // Verificar o cache do Redis
  const cachedProfile = await getAsync(username);
  if (cachedProfile) {
    console.log(`Cache hit for ${username}`);
    return JSON.parse(cachedProfile);
  }

  console.log(`Cache miss for ${username}. Fetching from Steam...`);
  const browser = await puppeteerExtra.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto(`https://steamcommunity.com/id/${username}/`, {
    waitUntil: "load",
    timeout: 0,
  });

  const html = await page.content();
  await browser.close();

  const $ = cheerio.load(html);
  const user = {};

  const isPrivate = $(".profile_private_info").length > 0;
  user.isPrivate = isPrivate;

  if (isPrivate) {
    user.profileName = $(".actual_persona_name").text().trim();
    user.location = null;
    user.avatar = null;
    user.description = null;
    user.level = null;
    user.friends = null;
    user.badges = null;
    user.games = null;
    user.screenshots = null;
    user.artwork = null;
    user.comments = null;
    user.recentActivity = null;
    user.recentGames = [];
    user.vacBanned = null;
  } else {
    user.profileName = $(".actual_persona_name").text().trim();
    user.location = $(".profile_flag").text().trim() || null;
    user.avatar = $(".profile_avatar_frame img").attr("src");
    user.description = $(".profile_summary").text().trim();
    user.level = parseInt($(".friendPlayerLevelNum").text().trim(), 10);
    user.friends = parseInt(
      $(".profile_friend_links .profile_count_link_total").text().trim(),
      10
    );
    user.badges = parseInt(
      $(".profile_badges .profile_count_link_total").text().trim(),
      10
    );
    user.games = parseInt(
      $(".profile_item_links .profile_count_link_total").first().text().trim(),
      10
    );
    user.screenshots = parseInt(
      $(".profile_item_links .profile_count_link_total").eq(2).text().trim(),
      10
    );
    user.artwork = parseInt(
      $(".profile_item_links .profile_count_link_total").eq(3).text().trim(),
      10
    );
    user.comments =
      parseInt(
        $("#commentthread_Profile_76561198301205885_totalcount").text().trim(),
        10
      ) || 0;
    user.recentActivity = $(".recentgame_recentplaytime").text().trim();

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

    const banStatus = $(".profile_ban_status .profile_ban").text().trim();
    user.vacBanned = banStatus.includes("banimento VAC");
  }

  // Armazenar no cache do Redis
  await setAsync(username, JSON.stringify(user), "EX", 604800); // Expirar em 7 dias

  return user;
};

app.post("/getUserProfile", async (req, res) => {
  const { username } = req.body;
  try {
    const userProfile = await getUserProfile(username);
    res.json(userProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

app.listen(PORT, () => {
  console.log(`Puppeteer service running on port ${PORT}`);
});
