const http = require("http");
const PORT = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Hello World!");
});

app.get("/screenshot", async (req, res) => {
  const query = req.query.q || "puppeteer"; // Consulta padrão se não for especificada na URL

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(`https://www.google.com/search?q=${query}`);
  await page.waitForTimeout(2000);
  const screenshot = await page.screenshot();

  await browser.close();

  res.set("Content-Type", "image/png");
  res.send(screenshot);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
