const puppeteer = require('puppeteer');
const { expect } = require('chai');

describe('Universal Interactive Learning Engine', function () {
  this.timeout(60000); // 60 seconds timeout for the entire suite

  let browser;
  let page;

  before(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
  });

  after(async () => {
    await page.screenshot({ path: 'test-screenshot.png' });
    await browser.close();
  });

  it('should load the page and display the main title', async () => {
    const mainTitle = await page.$eval('h2', el => el.textContent);
    expect(mainTitle).to.equal('Universal Interactive Learning Engine (MVP)');
  });

  it('should generate a plan and display the title and subtitle', async () => {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const query = 'Explain the structure of a water molecule';
    await page.type('textarea[placeholder="Type your topic (e.g., \'Explain H2O molecular structure and hydrogen bonding\')"]', query);
    await page.click('button');

    await page.waitForSelector('h3', { timeout: 60000 });
    const planTitle = await page.$eval('h3', el => el.textContent);
    expect(planTitle).to.be.a('string').and.not.be.empty;

    await page.waitForSelector('h4', { timeout: 30000 });
    const planSubtitle = await page.$eval('h4', el => el.textContent);
    expect(planSubtitle).to.be.a('string').and.not.be.empty;
  });

  it('should render the first part of the lecture on the canvas', async () => {
    await page.waitForSelector('.konvajs-content canvas', { timeout: 30000 });
    const canvas = await page.$('.konvajs-content canvas');
    expect(canvas).to.not.be.null;

    // Wait for some actions to be rendered on the canvas
    await new Promise(resolve => setTimeout(resolve, 5000));

    // You can add more specific assertions here, like checking for the presence of certain shapes or text
  });

  it('should render subsequent parts of the lecture after a delay', async () => {
    // Wait for the duration of one part + a buffer
    await new Promise(resolve => setTimeout(resolve, 65000));

    // Add assertions to verify that the content has changed
  });
});