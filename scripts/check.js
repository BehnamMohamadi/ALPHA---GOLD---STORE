const fs = require("node:fs"), path = require("node:path"), { spawnSync } = require("node:child_process"), ejs = require("ejs");
let files = 0;
function walk(dir) { for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
  if (["node_modules", ".git", "artifacts"].includes(ent.name)) continue;
  const p = path.join(dir, ent.name);
  if (ent.isDirectory()) walk(p);
  else if (p.endsWith(".js")) { const r = spawnSync(process.execPath, ["--check", p], { encoding: "utf8" }); if (r.status) { console.error(r.stderr); process.exitCode = 1; } files++; }
  else if (p.endsWith(".ejs")) { try { ejs.compile(fs.readFileSync(p, "utf8"), { filename: p }); } catch (e) { console.error(p, e.message); process.exitCode = 1; } files++; }
} }
walk(path.resolve(__dirname, "..")); console.log(`Checked ${files} JavaScript/templates.`);
