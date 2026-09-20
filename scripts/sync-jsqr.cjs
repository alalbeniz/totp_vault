const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const packageRoot = path.join(root, "node_modules", "jsqr");
const distFile = path.join(packageRoot, "dist", "jsQR.js");
const packageJson = path.join(packageRoot, "package.json");
const outDir = path.join(root, "vendor");

if (!fs.existsSync(distFile) || !fs.existsSync(packageJson)) {
  throw new Error("jsQR no está instalado. Ejecuta pnpm install.");
}

const meta = JSON.parse(fs.readFileSync(packageJson, "utf8"));
const licenseCandidates = ["LICENSE", "LICENSE.txt", "LICENSE.md"];
const licenseFile = licenseCandidates
  .map((name) => path.join(packageRoot, name))
  .find((file) => fs.existsSync(file));

if (!licenseFile) {
  throw new Error("No se encontró la licencia incluida en el paquete jsQR.");
}

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(distFile, path.join(outDir, "jsQR.js"));
fs.copyFileSync(licenseFile, path.join(outDir, "jsQR-LICENSE"));
fs.writeFileSync(
  path.join(outDir, "jsQR-VERSION"),
  `${meta.version}\n`,
  "utf8"
);

console.log(`Prepared jsQR ${meta.version} in vendor/`);
