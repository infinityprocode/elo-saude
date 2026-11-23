import { createRequire } from 'module'
import fs from 'fs'
const { chromium } = createRequire('/root/.hermes/hermes-agent/package.json')('playwright')
const dir = process.cwd()
const b = await chromium.launch()
for (const n of ['receita', 'pedido-exame', 'atestado']) {
  const p = await (await b.newContext({ viewport: { width: 820, height: 1120 }, deviceScaleFactor: 2 })).newPage()
  await p.goto(`file://${dir}/${n}.html`, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready)
  await p.locator('.folha').screenshot({ path: `${n}.png` })
  await p.pdf({ path: `${n}.pdf`, width: '820px', height: '1120px', printBackground: true })
  // versão "foto de celular": papel levemente torto, sombra e luz desigual sobre uma mesa
  const q = await (await b.newContext({ viewport: { width: 1200, height: 1500 } })).newPage()
  await q.setContent(`<html><body style="margin:0;width:1200px;height:1500px;background:radial-gradient(circle at 30% 20%,#b9a88f,#7d6b55 70%,#5e4f3e);display:grid;place-items:center;overflow:hidden">
    <div style="position:relative;transform:rotate(-3.2deg) perspective(1400px) rotateX(4deg);box-shadow:0 30px 60px rgba(0,0,0,.45)">
    <img src="data:image/png;base64,${fs.readFileSync(`${dir}/${n}.png`).toString('base64')}" style="width:900px;display:block;filter:contrast(.93) brightness(.97) sepia(.06)">
    <div style="position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.16),rgba(0,0,0,0) 40%,rgba(0,0,0,.14))"></div></div></body></html>`, { waitUntil: 'load' })
  await q.waitForTimeout(300)
  await q.screenshot({ path: `${n}-foto.jpg`, type: 'jpeg', quality: 82 })
}
await b.close()
