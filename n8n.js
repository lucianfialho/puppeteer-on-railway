require("dotenv").config();
const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "minha-chave-secreta";

// Middleware para validar API Key
function checkApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(403).json({ error: "Acesso negado. API Key inválida." });
  }
  next();
}

async function scrapeNFCe(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  console.log(`🔍 Acessando: ${url}`);

  await page.goto(url, { waitUntil: "domcontentloaded" });

  await page.waitForTimeout(5000); // Espera extra para carregamento lento

  try {
    await page.waitForSelector("#tabResult", { timeout: 15000 });
  } catch (error) {
    console.error("❌ Timeout: não encontrou #tabResult");

    // Captura o screenshot
    const screenshotPath = `screenshot-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await browser.close();

    return { error: "Timeout ao carregar a página", screenshot: screenshotPath };
  }

  const nfceData = await page.evaluate(() => {
    const getText = (el) => el?.innerText.trim() || null;

    // Captura informações principais da NFC-e
    const empresa = getText(document.querySelector(".txtTopo"));
    const cnpj = getText(document.querySelector(".txtTopo + span"));
    const endereco = getText(document.querySelector(".txtTopo + span + span"));
    const data_emissao = getText(document.querySelector("#spnDataEmissao"));
    const total = getText(document.querySelector("#spnVlT"));

    // Captura os itens da tabela
    const items = Array.from(document.querySelectorAll("#tabResult tr")).map((row) => {
      const descricao = getText(row.querySelector(".txtTit"));
      const codigo = getText(row.querySelector(".RCod"))?.replace("Código:", "").trim();
      const quantidade = getText(row.querySelector(".Rqtd"))?.replace("Qtde.:", "").trim();
      const unidade = getText(row.querySelector(".RUN"))?.replace("UN:", "").trim();
      const preco_unitario = getText(row.querySelector(".RvlUnit"))?.replace("Vl. Unit.:", "").trim();
      const preco_total = getText(row.querySelector(".valor"));

      return descricao
        ? { descricao, codigo, quantidade, unidade, preco_unitario, preco_total }
        : null;
    }).filter(item => item !== null);

    return { empresa, cnpj, endereco, data_emissao, total, items };
  });

  await browser.close();
  return nfceData;
}

// Rota protegida com API Key
app.get("/nfce", checkApiKey, async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: "URL da NFC-e é obrigatória" });
  }

  const result = await scrapeNFCe(url);

  // Se houve timeout, retorna o screenshot como uma imagem
  if (result.error && result.screenshot) {
    console.log(`📸 Screenshot salvo em ${result.screenshot}`);
    res.sendFile(result.screenshot, { root: __dirname }, (err) => {
      if (err) console.error("Erro ao enviar screenshot:", err);
      fs.unlinkSync(result.screenshot); // Apaga a imagem depois de enviar
    });
    return;
  }

  res.json({ success: true, data: result });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
