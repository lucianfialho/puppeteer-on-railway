import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import cheerio from "cheerio";

puppeteerExtra.use(stealthPlugin());

export async function getAllResults(query) {
  try {
    const browser = await puppeteerExtra.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(
      `https://www.google.com/search?q=${query.split(" ").join("+")}`
    );

    const html = await page.content();
    await browser.close();
    console.log("Browser closed");

    const $ = cheerio.load(html);
    const all = [];

    const h3Tags = $("h3");
    h3Tags.each((i, h3Tag) => {
      if (i < 10) {
        // Only process the first 10 results
        const parent = $(h3Tag).parent();
        const link = $(parent).attr("href");
        const text = $(h3Tag).text().trim();
        all.push({ text, link });
      }
    });

    return all.length > 0 ? all : []; // Return empty array if no results
  } catch (error) {
    console.log("Error in getAllResults:", error.message);
    return []; // Return empty array on error
  }
}
