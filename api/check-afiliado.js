import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  const cc = req.query.cc;
  if (!cc) {
    res.status(400).json({ error: 'Falta parámetro cc' });
    return;
  }

  let browser;
  try {
    // 1) Lanzar navegador headless
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });
    const page = await browser.newPage();

    // 2) Login
    await page.goto('https://transaccional.saludtotal.com.co/SaludTotal.Comerce/Login.aspx');
    await page.type('#txtUserName', process.env.SALUD_USER);
    await page.type('#txtPassword', process.env.SALUD_PASS);
    await Promise.all([
      page.click('#btnLogin'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // 3) Ir a Estado Afiliación Grupo Familiar
    await page.goto('https://transaccional.saludtotal.com.co/SaludTotal.Comerce/ConsultaAfiliado/EstadoAfiliacionGrupoFamiliar.aspx');
    await page.select('#ddlTipoIdentificacion', 'CEDULA_CIUDADANIA');
    await page.type('#txtDocumento', cc);
    await Promise.all([
      page.click('#btnBuscar'),
      page.waitForSelector('#tblResultados')
    ]);

    // 4) Extraer el estado detallado (columna 5, fila 2)
    const estadoDetallado = await page.$eval(
      '#tblResultados tr:nth-child(2) td:nth-child(5)',
      el => el.textContent.trim()
    );

    // 5) Devolver JSON
    res.status(200).json({
      afiliado: Boolean(estadoDetallado),
      estado_detallado: estadoDetallado
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
}
