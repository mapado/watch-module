import debounce from 'debounce';
import chokidar from 'chokidar';
import { debug } from './logging';
import { buildPath } from './build';
import argv from './argv';

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

  const srcPaths = modulePaths.map((path: string) => `${path}/src`);

  chokidar
    // One-liner for current directory, ignores .dotfiles
    .watch(srcPaths, { ignored: /(^|[/\\])\.[^./]/ })
    .on(
      'all',
      (
        _event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
        path: string
      ) => {
        const modulePath = modulePaths.find((tmpPath: string) =>
          path.startsWith(`${tmpPath}/`)
        );

        if (!modulePath) {
          throw new Error(
            'Unable to find module path. This should not happen.'
          );
        }

        onChange(modulePath);
      }
    );
}

main();
