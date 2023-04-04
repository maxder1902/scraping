const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {

  const browser = await puppeteer.launch({ headless: true, devtools: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('https://www.carrefour.es/supermercado?ic_source=portal-y-corporativo&ic_medium=category-food-box&ic_content=ns', { waitUntil: 'load' });

  const button = await page.$('#onetrust-reject-all-handler');
  if (button) {
    await button.click();
  } else {
    console.log('No se pudo hacer click en el botón');
  }
  
  try {
    await page.waitForSelector('.product-card', { waitUntil: 'domcontentloaded' });
  } catch (e) {
    console.error('No se encontró el selector: .product-card');
    await browser.close();
    return;
  }

  const elements = await page.$$('.product-card');
  const data = await Promise.all(elements.map(async (element) => {
    const title = await element.$eval('.product-card__title', (el) => el.textContent.trim());
    const price = parseFloat(await element.$eval('.product-card__prices', (el) => el.textContent.trim().replace(',', '.')));
    console.log(`Título: ${title}, Precio: ${price}`);
    return { title, price };
  }));

  
  await browser.close();

  // Writing the data into a csv file.
  const file = fs.createWriteStream('productsCarrefour.csv');
  file.on('error', (err) => console.error('Error al escribir en el archivo', err));
  file.write('Producto,Precio\n');
  for (let i = 0; i < data.length; i++) {
    const { title, price } = data[i];
    const formattedPrice = price.toString().replace('\t', '');
    file.write(`${title},${formattedPrice}\n`);
  }
  console.log('Datos introducidos en el archivo');
  file.end();

})();