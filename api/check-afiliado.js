import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  const cc = req.query.cc;
  if (!cc) return res.status(400).json({ error: 'Falta parámetro cc' });

  // Lanza Chromium en modo headless
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });
  const page = await browser.newPage();

  // 1) Login
  await page.goto('https://transaccional.saludtotal.com.co/SaludTotal.Comerce/Login.aspx');
  await page.type('#txtUserName', process.env.SALUD_USER);
  await page.type('#txtPassword', process.env.SALUD_PASS);
  await Promise.all([
    page.click('#btnLogin'),
    page.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);

  // 2) Consulta afiliado
  await page.goto('https://transaccional.saludtotal.com.co/SaludTotal.Comerce/ConsultaAfiliado.aspx');
  await page.type('#txtDocumento', cc);
  await Promise.all([
    page.click('#btnBuscar'),
    page.waitForSelector('#lblEstado')
  ]);

  // 3) Captura estado y responde JSON
  const estado = await page.$eval('#lblEstado', el => el.textContent.trim());
  await browser.close();
  res.json({ afiliado: estado === 'Activo' });
}
