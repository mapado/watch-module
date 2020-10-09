import process from 'process';
import debounce from 'debounce';
import chokidar from 'chokidar';
import { promises as fs } from 'fs-extra';
import { debug } from './logging';
import { buildPath, restoreOldDirectories } from './build';
import argv from './argv';

async function getWatchPaths(modulePaths: string[]): Promise<string[]> {
  const srcPaths: string[] = [];
  for (let i = 0; i < modulePaths.length; i++) {
    const path = modulePaths[i];
    try {
      // first look for an src/ dir
      const srcPath = `${path}/src`;
      const stats = await fs.stat(srcPath);
      if (stats.isDirectory()) {
        srcPaths.push(srcPath);
      }
      continue;
    } catch {}

    try {
      // then look for a lib/ dir
      const libPath = `${path}/lib`;
      const stats = await fs.stat(libPath);
      if (stats.isDirectory()) {
        srcPaths.push(libPath);
      }
      continue;
    } catch {}

    // if none of the above dirs were found, watch root path
    srcPaths.push(path);
  }
  return srcPaths;
}

function main(): void {
  debug('arguments: ', argv);

  /* ================== debounce & events ================== */

  const changedModules: Set<string> = new Set();
  function buildAll(): void {
    changedModules.forEach(buildPath);
    changedModules.clear();
  }

  const debouncedOnChangeAll = debounce(buildAll, 200);
  function onChange(modulePath: string): void {
    changedModules.add(modulePath);
    debouncedOnChangeAll();
  }

  const modulePaths = argv._;

  if (modulePaths.length === 0) {
    console.error("You must specify a module's path !!!");
    return;
  }

  getWatchPaths(modulePaths).then(srcPaths => {
    chokidar
      // One-liner for current directory, ignores .dotfiles
      .watch(srcPaths, { ignored: /(^|[/\\])\.[^./]/ })
      .on(
        'all',
        (
          _event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
          path: string
        ) => {
          const modulePath = modulePaths.find((tmpPath: string) => {
            return (
              // check if path starts with the module path or if it is the root of the module
              path.startsWith(`${tmpPath}/`) || path.startsWith(`${tmpPath}`)
            );
          });

          if (!modulePath) {
            throw new Error(
              'Unable to find module path. This should not happen.'
            );
          }

          onChange(modulePath);
        }
      );

    process.on('SIGINT', () => {
      Promise.all(restoreOldDirectories(modulePaths)).then(() => {
        process.exit();
      });
    });
  });
}

main();
