import { chromium } from "playwright";

const base = "https://olehhavrilko.github.io/verifypromtsAI";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 250)); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 250)));

await page.goto(base + "/", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(1500);
console.log("HOME url:", page.url());
console.log("HOME h1:", await page.locator("h1").first().innerText().catch(() => "<none>"));
console.log("HOME banner:", await page.locator("text=Supabase не настроен").count());
await page.screenshot({ path: "D:/Projects/promtforge/_live-home.png" });

await page.goto(base + "/pricing", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(1500);
console.log("DEEPLINK url:", page.url());
console.log("DEEPLINK h1:", await page.locator("h1").first().innerText().catch(() => "<none>"));
await page.screenshot({ path: "D:/Projects/promtforge/_live-pricing.png" });

await page.goto(base + "/app/text-tools", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(1200);
console.log("DEEPLINK2 url:", page.url());
console.log("DEEPLINK2 h1:", await page.locator("h1").first().innerText().catch(() => "<none>"));

console.log("CONSOLE ERRORS:", errors.length ? JSON.stringify([...new Set(errors)], null, 2) : "none");
await browser.close();
