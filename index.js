const express = require("express");

const generateImage = require("./lib/generateImage");
const previewImage = require("./lib/previewImage");

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/generate-image", generateImage);

app.get("/preview", previewImage);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
