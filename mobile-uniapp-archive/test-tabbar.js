const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } })
  const page = await context.newPage()

  const logs = []
  page.on('console', msg => logs.push(msg.text()))
  page.on('pageerror', err => logs.push('PAGEERROR: ' + err.message))

  console.log('Navigating to home...')
  await page.goto('http://localhost:5176/#/pages/home/index')
  await page.waitForTimeout(5000)

  const tabBar = await page.$('.tab-bar')
  console.log('tabBar exists:', !!tabBar)

  if (tabBar) {
    const bbox = await tabBar.boundingBox()
    console.log('tabBar bbox:', JSON.stringify(bbox))
  }

  const html = await page.content()
  console.log('contains tab-bar class:', html.includes('tab-bar'))
  console.log('contains tab-bar-inner:', html.includes('tab-bar-inner'))

  // Check app root
  const appMobile = await page.$('.app-mobile')
  console.log('appMobile exists:', !!appMobile)
  if (appMobile) {
    const children = await page.evaluate(el => Array.from(el.children).map(c => c.className || c.tagName), appMobile)
    console.log('appMobile children:', JSON.stringify(children))
  }

  console.log('--- console logs ---')
  logs.forEach(l => console.log(l))

  await browser.close()
})()
