const puppeteer = require('puppeteer');
const fs = require("fs");

(async () => {

    //Creating and launching the headless browser.
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('https://www.aldi.es/ofertas.html#2023-03-22');

    //Collecting data within the selector from ALDI's site.
    try {
        await page.waitForSelector('.tiles-grid', { timeout: 60000 }).catch(() => console.error('Timeout de waitForSelector'));
    } catch (e) {
        console.error('No se encontró el selector: .tiles-grid');
        await browser.close();
        return;
    }

    //Infinite scroll function.
    let previousHeight = 0;
    let data = [];
    while (true) {
        const newHeight = await page.evaluate('document.body.scrollHeight');
        if (newHeight == previousHeight) {
            break;
        }

        previousHeight = newHeight;
        await page.evaluate(`window.scrollTo(0, ${newHeight})`);
        await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`, { timeout: 60000 }).catch(() => console.error('Timeout de waitForFunction'));
    }

    //Collecting title and price from the products.
    const elements = await page.$$('.mod-article-tile__content');
    const promises = elements.map(async (element) => {
        const title = await element.$eval('.mod-article-tile__title', (el) => el.textContent.trim());
        const price = await element.$eval('.price__wrapper', (el) => el.textContent.trim());
        return { title, price };
    });
    data = await Promise.all(promises);

    //Writing the data into a csv file.

    const file = fs.createWriteStream('products.csv');
    file.on('error', (err) => console.error('Error al escribir en el archivo', err));
    file.write('Producto,Precio\n');

    //loop to remove tabs
    for ( let i = 0; i < data.length; i++) {
        const {title, price} = data[i];
        const formattedPrice = price.replace('\t', '');
        file.write(`${title},${formattedPrice}\n`);
    }
    console.log('Datos introducidos en el archivo');
    file.end();
    await browser.close();
})();