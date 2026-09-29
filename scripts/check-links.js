const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "static");
const files = fs.readdirSync(dir).filter((name) => name.endsWith(".html"));
const missing = [];

files.forEach((file) => {
  const html = fs.readFileSync(path.join(dir, file), "utf8");
  if (!html.includes("css/app.css") || !html.includes("js/app.js")) {
    missing.push(`${file} is missing compiled assets`);
  }
  const hrefs = html.match(/href="([^"]+)"/g) || [];
  hrefs.forEach((raw) => {
    const href = raw.slice(6, -1);
    if (href.startsWith("http") || href.startsWith("#") || href.startsWith("css/") || href.startsWith("img/")) {
      return;
    }
    const clean = href.split("#")[0].split("?")[0];
    if (!clean) {
      return;
    }
    if (!fs.existsSync(path.join(dir, clean))) {
      missing.push(`${file} -> ${href}`);
    }
  });
});

if (missing.length) {
  console.error(missing.join("\n"));
  process.exit(1);
}

console.log(`${files.length} pages, internal links ok`);
