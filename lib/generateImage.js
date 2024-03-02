const puppeteer = require("puppeteer");
const generateHtmlTemplate = require("./generateHtmlTemplate");
module.exports = async (req, res) => {
  const { word, translation } = req.query;

  const decodedWord = decodeURIComponent(word);
  const decodedTranslation = decodeURIComponent(translation);
  if (!word && !translation) {
    return res.status(400).send("Content query parameter is required.");
  }

  try {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ignoreDefaultArgs: ["--disable-extensions"],
    });
    const page = await browser.newPage();

    // Insira o CDN do Tailwind CSS no cabeçalho do HTML
    const fullHtml = generateHtmlTemplate(decodedWord, decodedTranslation);

    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
    });

    const imageBuffer = await page.screenshot({ fullPage: true });

    const processedImage = await sharp(imageBuffer)
      .jpeg({ quality: 80 }) // Ajusta a qualidade para 80
      .toBuffer();

    await browser.close();
    res.contentType("image/jpeg");
    res.send(processedImage);
  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).send("Error generating image.");
  }
};
