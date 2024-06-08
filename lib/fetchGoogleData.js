const puppeteerExtra = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");

puppeteerExtra.use(stealthPlugin());

module.exports = async (query) => {
  try {
    const browser = await puppeteerExtra.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(`https://www.google.com/search?q=${query}`, {
      waitUntil: "load",
      timeout: 0,
    });

    const html = await page.content();
    await browser.close();
    console.log("Browser closed");

    const $ = cheerio.load(html);
    const all = [];

    $("div.g").each((i, elem) => {
      if (i < 10) {
        // Only process the first 10 results
        const h3 = $(elem).find("h3");
        const a = $(elem).find("a");
        const snippetElem = $(elem).find("div.IsZvec");

        const title = h3.text().trim();
        const link = a.attr("href");
        const snippet = snippetElem.text().trim();

        if (title && link) {
          all.push({ title, link, snippet });
        }
      }
    });

    return all.length > 0 ? all : []; // Return empty array if no results
  } catch (error) {
    console.log("Error in getAllResults:", error.message);
    return []; // Return empty array on error
  }
};
