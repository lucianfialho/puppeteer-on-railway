const http = require("http");
const url = require("url"); // Importe o módulo 'url'
const puppeteer = require("puppeteer");
const PORT = 3000;

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true); // Analise a URL para obter os parâmetros

  const query = parsedUrl.query.q || "puppeteer"; // Consulta padrão se não for especificada na URL

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(`https://www.google.com/search?q=${query}`);
  await page.waitForTimeout(2000);
  const screenshot = await page.screenshot();

  await browser.close();

  res.setHeader("Content-Type", "image/png"); // Use 'setHeader' para definir o cabeçalho
  res.end(screenshot); // Use 'end' para enviar a resposta
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
