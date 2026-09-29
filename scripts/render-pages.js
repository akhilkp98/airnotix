const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pagesDir = path.join(root, "src", "pages");
const layoutDir = path.join(root, "src", "layout");
const outDir = path.join(root, "static");

const NAV = [
  { header: "Overview" },
  { id: "dashboard", href: "index.html", label: "Dashboard", icon: "grid", permission: "dashboard.view" },
  { header: "Academy" },
  { id: "cadets", href: "cadets.html", label: "Cadets", icon: "users", permission: "cadets.view" },
  { id: "training", href: "training.html", label: "Training & Knowledge", icon: "book-open", permission: "training.view" },
  { id: "operations", href: "flight-operations.html", label: "Flight Operations", icon: "navigation", permission: "flights.view" },
  { id: "fleet", href: "fleet.html", label: "Fleet", icon: "send", permission: "fleet.view" },
  { id: "maintenance", href: "maintenance.html", label: "Maintenance", icon: "tool", permission: "maintenance.view" },
  { id: "fuel", href: "fuel.html", label: "Fuel", icon: "droplet", permission: "fuel.view" },
  { id: "finance", href: "finance.html", label: "Finance", icon: "credit-card", permission: "finance.view" },
  { id: "staff", href: "people.html", label: "HR & Staff", icon: "briefcase", permission: "staff.view" },
  { header: "Governance" },
  { id: "documents", href: "documents.html", label: "Documents & Compliance", icon: "folder", permission: "documents.view" },
  { id: "approvals", href: "approvals.html", label: "Notifications & Approvals", icon: "bell", permission: "approvals.view" },
  { id: "reports", href: "reports.html", label: "Reports", icon: "bar-chart-2", permission: "reports.view" },
  { header: "Administration" },
  { id: "settings", href: "settings.html", label: "Academy Settings", icon: "settings", permission: "settings.manage" },
  { id: "users", href: "users.html", label: "Users & Roles", icon: "shield", permission: "users.manage" },
  { id: "audit", href: "audit.html", label: "Audit Log", icon: "list", permission: "audit.view" }
];

const CADET_NAV = [
  { id: "portal", href: "portal.html", label: "My Dashboard", icon: "grid" },
  { id: "portal-schedule", href: "portal-schedule.html", label: "My Schedule", icon: "calendar" },
  { id: "portal-training", href: "portal-training.html", label: "My Training", icon: "book-open" },
  { id: "portal-notifications", href: "portal-notifications.html", label: "Notifications", icon: "bell" },
  { id: "portal-profile", href: "portal-profile.html", label: "My Profile", icon: "user" }
];

const OBSOLETE = [
  "ui-buttons.html",
  "ui-forms.html",
  "ui-cards.html",
  "ui-typography.html",
  "icons-feather.html",
  "charts-chartjs.html",
  "maps-google.html",
  "upgrade-to-pro.html",
  "pages-profile.html",
  "pages-blank.html",
  "pages-sign-in.html",
  "pages-sign-up.html"
];

const templateFiles = () => {
  const pages = fs.readdirSync(pagesDir).filter((name) => name.endsWith(".html")).map((name) => path.join(pagesDir, name));
  const layouts = fs.readdirSync(layoutDir).filter((name) => name.endsWith(".html")).map((name) => path.join(layoutDir, name));
  return pages.concat(layouts);
};

const parsePage = (source, filename) => {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Missing front matter in ${filename}`);
  }

  const meta = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const index = line.indexOf(":");
    if (index === -1) {
      return;
    }
    meta[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  });

  return { meta, body: match[2].trim() };
};

const itemHtml = (item, active) => {
  if (item.header) {
    return `<li class="sidebar-header">${item.header}</li>`;
  }
  const current = item.id === active;
  return [
    `<li class="sidebar-item${current ? " active" : ""}" data-permission="${item.permission || "portal.view"}">`,
    `<a class="sidebar-link" href="${item.href}"${current ? ' aria-current="page"' : ""}>`,
    `<i class="align-middle" data-feather="${item.icon}" aria-hidden="true"></i>`,
    `<span class="align-middle">${item.label}</span>`,
    "</a>",
    "</li>"
  ].join("");
};

const navHtml = (active) => NAV.map((item) => itemHtml(item, active)).join("\n");
const cadetNavHtml = (active) => CADET_NAV.map((item) => itemHtml(item, active)).join("\n");

const render = () => {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.readdirSync(pagesDir).filter((name) => name.endsWith(".html")).forEach((filename) => {
    const source = fs.readFileSync(path.join(pagesDir, filename), "utf8");
    const { meta, body } = parsePage(source, filename);
    const layoutName = meta.layout === "auth" ? "auth.html" : "shell.html";
    let html = fs.readFileSync(path.join(layoutDir, layoutName), "utf8");
    const outputName = meta.output || filename;

    html = html
      .replaceAll("@@TITLE@@", meta.title || "Airnotix")
      .replaceAll("@@DESCRIPTION@@", meta.description || "Airnotix flying academy prototype")
      .replaceAll("@@HEADING@@", meta.heading || meta.title || "")
      .replaceAll("@@SUBTITLE@@", meta.subtitle || "")
      .replaceAll("@@PAGE@@", meta.page || "")
      .replaceAll("@@PERMISSION@@", meta.permission || "")
      .replaceAll("@@NAV@@", navHtml(meta.nav || ""))
      .replaceAll("@@NAV_CADET@@", cadetNavHtml(meta.nav || ""))
      .replaceAll("@@CONTENT@@", body);

    fs.writeFileSync(path.join(outDir, outputName), html);
  });

  OBSOLETE.forEach((filename) => {
    const target = path.join(outDir, filename);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  });
};

module.exports = { render, templateFiles };

if (require.main === module) {
  render();
}
