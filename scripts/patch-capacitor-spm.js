import fs from "node:fs";
import path from "node:path";

const patches = [
  "node_modules/@capacitor/browser/Package.swift",
  "node_modules/@capacitor/app/Package.swift",
  "node_modules/@capacitor/geolocation/Package.swift",
  "node_modules/@capgo/capacitor-pedometer/Package.swift",
];

patches.forEach((filePath) => {
  const absolutePath = path.resolve(filePath);
  if (fs.existsSync(absolutePath)) {
    let content = fs.readFileSync(absolutePath, "utf8");
    let patched = false;
    if (content.includes('branch: "main"')) {
      content = content.replace(
        'url: "https://github.com/ionic-team/capacitor-swift-pm.git", branch: "main"',
        'url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "7.4.4"',
      );
      patched = true;
    } else if (content.includes('from: "7.0.0"')) {
      content = content.replace(
        'url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0"',
        'url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "7.4.4"',
      );
      patched = true;
    }
    if (patched) {
      fs.writeFileSync(absolutePath, content, "utf8");
      console.log(`[SPM Patch] Successfully patched ${filePath}`);
    }
  }
});
