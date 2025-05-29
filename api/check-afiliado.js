import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  const cc = req.query.cc;
  if (!cc) return res.status(400).json({ error: 'Falta parámetro cc' });

  // 1) Lanzar navegador headless
  const browser = await puppeteer.launch({
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

  // 3) Navegar a Estado Afiliación Grupo Familiar
  await page.goto('https://transaccional.saludtotal.com.co/SaludTotal.Comerce/ConsultaAfiliado/EstadoAfiliacionGrupoFamiliar.aspx');

  // 4) Seleccionar tipo de identificación (opcional)
  await page.select('#ddlTipoIdentificacion', 'CEDULA_CIUDADANIA');

  // 5) Escribir el documento y buscar
  await page.type('#txtDocumento', cc);
  await Promise.all([
    page.click('#btnBuscar'),            // Botón “Aceptar”
    page.waitForSelector('#tblResultados') // ID de la tabla de resultados
  ]);

  // 6) Extraer estado detallado (columna 5 de la fila 2)
  const estadoDetallado = await page.$eval(
    '#tblResultados tr:nth-child(2) td:nth-child(5)',
    td => td.textContent.trim()
  );

  await browser.close();

  // 7) Responder JSON
  res.json({
    afiliado: Boolean(estadoDetallado),
    estado_detallado: estadoDetallado || null
  });
}

}
