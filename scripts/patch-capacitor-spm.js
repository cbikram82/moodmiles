import fs from 'node:fs';
import path from 'node:path';

const patches = [
  'node_modules/@capacitor/browser/Package.swift',
  'node_modules/@capacitor/app/Package.swift',
  'node_modules/@capacitor/geolocation/Package.swift',
];

patches.forEach(filePath => {
  const absolutePath = path.resolve(filePath);
  if (fs.existsSync(absolutePath)) {
    let content = fs.readFileSync(absolutePath, 'utf8');
    if (content.includes('branch: "main"')) {
      content = content.replace(
        'url: "https://github.com/ionic-team/capacitor-swift-pm.git", branch: "main"',
        'url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "7.4.4"'
      );
      fs.writeFileSync(absolutePath, content, 'utf8');
      console.log(`[SPM Patch] Successfully patched ${filePath}`);
    }
  }
});
