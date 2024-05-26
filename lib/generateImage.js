const puppeteer = require("puppeteer");
const generateHtmlTemplate = require("./generateHtmlTemplate");

module.exports = async (req, res) => {
  const { title, image } = req.query;

  const decodedTitle = decodeURIComponent(title);

  if (!title && !image) {
    return res.status(400).send("Content query parameter is required.");
  }

  try {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ignoreDefaultArgs: ["--disable-extensions"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 800 });

    // Insira o CDN do Tailwind CSS no cabeçalho do HTML
    const fullHtml = generateHtmlTemplate(decodedTitle, image);

    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
    });

    const imageBuffer = await page.screenshot({
      fullPage: true,
      type: "jpeg",
      quality: 80,
    });

    await browser.close();
    res.contentType("image/jpeg");
    res.send(imageBuffer);
  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).send("Error generating image.");
  }
};
