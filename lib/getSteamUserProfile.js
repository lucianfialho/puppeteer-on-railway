const puppeteerExtra = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteerExtra.use(stealthPlugin());

module.exports = async (username) => {
  const browser = await puppeteerExtra.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  const URL = `https://steamcommunity.com/id/${username}/`;
  await page.goto(URL);

  const user = await page.evaluate(() => {
    const user = {};

    const getTextContent = (selector) => {
      const element = document.querySelector(selector);
      console.log(element);
      return element ? element.textContent.trim() : null;
    };

    user.profileName = getTextContent(".actual_persona_name");
    user.location = getTextContent(".profile_flag");
    user.avatar = document.querySelector(".profile_avatar_frame img")?.src;
    user.description = getTextContent(".profile_summary");
    user.level = parseInt(getTextContent(".friendPlayerLevelNum"), 10);
    user.friends = parseInt(
      getTextContent(".profile_friend_links .profile_count_link_total"),
      10
    );
    user.badges = parseInt(
      getTextContent(".profile_badges .profile_count_link_total"),
      10
    );
    user.games = parseInt(
      getTextContent(".profile_item_links .profile_count_link_total"),
      10
    );
    user.screenshots = parseInt(
      document
        .querySelectorAll(".profile_item_links .profile_count_link_total")[2]
        ?.textContent.trim(),
      10
    );
    user.artwork = parseInt(
      document
        .querySelectorAll(".profile_item_links .profile_count_link_total")[3]
        ?.textContent.trim(),
      10
    );
    user.comments =
      parseInt(
        getTextContent("#commentthread_Profile_76561198301205885_totalcount"),
        10
      ) || 0;
    user.recentActivity = getTextContent(".recentgame_recentplaytime");

    return user;
  });

  await browser.close();
  return user;
};
