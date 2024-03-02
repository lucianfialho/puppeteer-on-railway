const express = require("express");

const generateImage = require("./lib/generateImage");
const previewImage = require("./lib/previewImage");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/generate-image", generateImage);

app.get("/preview", previewImage);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
});
