import process from 'process';
import debounce from 'debounce';
import chokidar from 'chokidar';
import { debug, log } from './logging.js';
import { buildPath, restoreOldDirectories } from './build.js';
import argv from './argv.js';
import { getIncludesPaths, getExcludesPaths } from './config-utils.js';

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

  const includesPaths = getIncludesPaths(modulePaths);
  const excludesPaths = getExcludesPaths(modulePaths);

  if (!includesPaths.length) {
    log('nothing to watch, exiting...');
  }
  // return;
  chokidar
    // One-liner for current directory, ignores .dotfiles
    .watch(includesPaths, { ignored: [/(^|[/\\])\.[^./]/, ...excludesPaths] })
    .on(
      'all',
      (
        _event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
        path: string
      ) => {
        const modulePath = modulePaths.find((tmpPath: string) => {
          return (
            // check if path starts with the module path
            path.startsWith(`${tmpPath}/`)
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
}

main();
