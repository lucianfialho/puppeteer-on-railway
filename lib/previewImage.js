const generateHtmlTemplate = require("./generateHtmlTemplate");
module.exports = async (req, res) => {
  const { title, image, summary } = req.query;

  if (!title && !image) {
    return res.status(400).send("Content query parameter is required.");
  }

  try {
    const decodedTitle = decodeURIComponent(title);
    const decodedSummary = decodeURIComponent(summary);
    const fullHtml = generateHtmlTemplate(decodedTitle, image, decodedSummary);

    res.setHeader("Content-Type", "text/html");
    res.send(fullHtml);
  } catch (error) {
    console.error("Error generating preview image:", error);
    res.status(500).send("Error generating preview image.");
  }
};
