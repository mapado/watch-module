import process from 'process';
import debounce from 'debounce';
import chokidar from 'chokidar';
import { debug, log } from './logging.js';
import { buildModule, restoreOldDirectories } from './build.js';
import argv from './argv.js';
import { getIncludesPaths, getExcludesPaths } from './config-utils.js';
import { getFileHash } from './utils.js';

const fileHashCache: Record<string, string> = {};

function main(): void {
  debug('arguments: ', argv);

  /* ================== debounce & events ================== */

  const changedModules: Set<string> = new Set();
  const changedPathsByMoodule: Map<string, Set<string>> = new Map();
  function buildAll(): void {
    changedModules.forEach((module) =>
      buildModule(module, changedPathsByMoodule.get(module) || new Set())
    );
    changedModules.clear();
    changedPathsByMoodule.clear();
  }

  const debouncedOnChangeAll = debounce(buildAll, 200);
  function onChange(modulePath: string, path: string): void {
    changedModules.add(modulePath);

    const pathSet = changedPathsByMoodule.get(modulePath);

    if (pathSet) {
      pathSet.add(path);
    } else {
      changedPathsByMoodule.set(modulePath, new Set([path]));
    }

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

  chokidar
    // One-liner for current directory, ignores .dotfiles
    .watch(includesPaths, { ignored: [/(^|[/\\])\.[^./]/, ...excludesPaths] })
    .on(
      'all',
      (
        _event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
        path: string
      ) => {
        const modulePath = modulePaths.find((innerModulePath: string) => {
          return (
            // check if path starts with the module path
            path.startsWith(`${innerModulePath}/`)
          );
        });

        if (!modulePath) {
          throw new Error(
            'Unable to find module path. This should not happen.'
          );
        }

        // generate hash for files
        const newFileHash: string | null = ['add', 'change'].includes(_event)
          ? getFileHash(path)
          : null;

        if (_event === 'change' && fileHashCache[path] === newFileHash) {
          // file has not changed
          debug(`file ${path} has been saved but the content did not changed.`);
          return;
        }

        if (_event === 'change') {
          debug(`File changes: ${path}`);
        }

        if (newFileHash) {
          // save hash for next time
          fileHashCache[path] = newFileHash;
        } else if (_event === 'unlink') {
          // or clear hash if file was deleted
          delete fileHashCache[path];
        }

        onChange(modulePath, path);
      }
    );

  process.on('SIGINT', () => {
    Promise.all(restoreOldDirectories(modulePaths)).then(() => {
      process.exit();
    });
  });
}

main();
