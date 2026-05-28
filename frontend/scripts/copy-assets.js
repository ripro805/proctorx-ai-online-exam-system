import fs from "fs";
import path from "path";

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return false;
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

const assetSource = path.join(process.cwd(), "dist", "client", "assets");
const localPublicAssets = path.join(process.cwd(), "public", "assets");
const repoRootPublicAssets = path.join(process.cwd(), "..", "public", "assets");

if (!copyDir(assetSource, localPublicAssets)) {
  console.warn(`[copy-assets] source not found: ${assetSource}`);
  process.exit(0);
}

copyDir(assetSource, repoRootPublicAssets);
console.log(`[copy-assets] copied assets from ${assetSource} to ${localPublicAssets} and ${repoRootPublicAssets}`);