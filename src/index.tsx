import React from 'react';
import process from 'process';
import debounce from 'debounce';
import chokidar from 'chokidar';
import { render } from 'ink';
import { createLogger, debug, log } from './logging.js';
import { buildPath, restoreOldDirectories } from './build.js';
import argv from './argv.js';
import { getIncludesPaths, getExcludesPaths } from './config-utils.js';
import { getFileHash, getModuleNameForPath } from './utils.js';
import Renderer from './Renderer.js';
import EventEmitter from 'events';

const fileHashCache: Record<string, string> = {};

class MyEmitter extends EventEmitter {}

function main(): void {
  const emitter = new MyEmitter();
  const logger = createLogger(emitter);

  debug('watch-module', JSON.stringify(argv));

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
    log('watch-module', 'nothing to watch, exiting...');
  }

  const moduleNameSet = new Set<string>();

  function watchPaths(includesPaths: string[], excludesPaths: string[]): void {
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

          const moduleName = getModuleNameForPath(modulePath);

          moduleNameSet.add(moduleName);

          // generate hash for files
          const newFileHash: string | null = ['add', 'change'].includes(_event)
            ? getFileHash(path)
            : null;

          if (_event === 'change' && fileHashCache[path] === newFileHash) {
            // file has not changed
            debug(
              moduleName,
              `file ${path} has been saved but the content did not changed.`
            );
            return;
          }

          if (_event === 'change') {
            debug(moduleName, `File changes: ${path}`);
          }

          if (newFileHash) {
            // save hash for next time
            fileHashCache[path] = newFileHash;
          } else if (_event === 'unlink') {
            // or clear hash if file was deleted
            delete fileHashCache[path];
          }

          onChange(modulePath);
        }
      );
  }

  watchPaths(includesPaths, excludesPaths);

  function beforeExit(): void {
    Promise.all(restoreOldDirectories(modulePaths)).then(() => {
      process.exit();
    });
  }

  process.on('SIGINT', () => {
    beforeExit();
  });

  process.on('SIGTERM', () => {
    beforeExit();
  });

  function watchNewPath(modulePath: string): void {
    modulePaths.push(modulePath);

    watchPaths(getIncludesPaths([modulePath]), getExcludesPaths([modulePath]));
  }

  const renderApp = render(
    <Renderer
      moduleNameSet={moduleNameSet}
      logLines={logger.getLines()}
      onAddNewPath={watchNewPath}
      onExit={beforeExit}
    />,
    {
      exitOnCtrlC: false,
    }
  );

  emitter.on('newLogLine', () => {
    renderApp.rerender(
      <Renderer
        moduleNameSet={moduleNameSet}
        logLines={logger.getLines()}
        onAddNewPath={watchNewPath}
        onExit={beforeExit}
      />
    );
  });
}

main();
