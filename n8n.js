require("dotenv").config();
const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "minha-chave-secreta"; // API Key padrão para teste

// Middleware para validar API Key
function checkApiKey(req, res, next) {

  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(403).json({ error: "Acesso negado. API Key inválida." });
  }
  next();
}

async function scrapeNFCe(url) {
  const browser = await puppeteer.launch({ headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
   });
  const page = await browser.newPage();

  console.log(`🔍 Acessando: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  await page.waitForSelector("#tabResult"); // Espera a tabela carregar

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
    }).filter(item => item !== null); // Remove itens nulos

    return { empresa, cnpj, endereco, data_emissao, total, items };
  });

  await browser.close();
  return nfceData;
}

// Aplicamos o middleware de API Key na rota
app.get("/nfce", checkApiKey, async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: "URL da NFC-e é obrigatória" });
  }

  try {
    const data = await scrapeNFCe(url);
    res.json({ success: true, data });
  } catch (error) {
    console.error("❌ Erro ao extrair NFC-e:", error);
    res.status(500).json({ error: "Erro ao processar NFC-e" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
