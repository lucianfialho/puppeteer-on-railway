const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const generateImage = require("./lib/generateImage");
const previewImage = require("./lib/previewImage");
const getAllResults = require("./lib/fetchGoogleData");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/generate-image", generateImage);

app.get("/preview", previewImage);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
});

const checkApiToken = (req, res, next) => {
  const token = req.headers["x-api-token"];
  if (!token || token !== process.env.API_TOKEN) {
    return res.status(403).send("Forbidden: Invalid or missing API token");
  }
  next();
};

app.get("/search", checkApiToken, async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).send("Query parameter 'q' is required");
  }

  try {
    const results = await getAllResults(
      `"${query}" -site:${query} +link:${query}`
    );
    res.json(results);
  } catch (error) {
    res.status(500).send("Error retrieving search results");
  }
});
