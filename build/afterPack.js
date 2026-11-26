// electron-builder afterPack hook.
// electron-builder bakes package.json "description" into the exe's FileDescription
// version string, and the Windows shell shows FileDescription as the app name in
// "Open with" / default-app lists. Pin it to the short product name instead.
// Runs before electron-builder signs the exe, so the edit stays valid.
const { join } = require('path');
const { execFileSync } = require('child_process');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const exePath = join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const appBuilderExe = join(
    __dirname, '..', 'node_modules', 'app-builder-bin', 'win', 'x64', 'app-builder.exe',
  );
  const args = [
    'rcedit',
    '--args',
    JSON.stringify([
      exePath,
      '--set-version-string', 'FileDescription', 'FeatherMark',
      '--set-version-string', 'ProductName', 'FeatherMark',
    ]),
  ];
  try {
    execFileSync(appBuilderExe, args, { stdio: 'inherit' });
  } catch (err) {
    throw new Error('afterPack rcedit failed (FileDescription not overridden): ' + err.message);
  }
};
