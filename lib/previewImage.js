const generateHtmlTemplate = require("./generateHtmlTemplate");
module.exports = async (req, res) => {
  const { word, translation } = req.query;

  if (!word && !translation) {
    return res.status(400).send("Content query parameter is required.");
  }

  try {
    const decodedWord = decodeURIComponent(word);
    const decodedTranslation = decodeURIComponent(translation);
    const fullHtml = generateHtmlTemplate(decodedWord, decodedTranslation);

    res.setHeader("Content-Type", "text/html");
    res.send(fullHtml);
  } catch (error) {
    console.error("Error generating preview image:", error);
    res.status(500).send("Error generating preview image.");
  }
};
