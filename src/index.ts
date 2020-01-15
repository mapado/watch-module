import { exec } from 'child_process';
import fs from 'fs-extra';
import nodeProcess from 'process';
import debounce from 'debounce';
import chokidar from 'chokidar';
import minimist from 'minimist';
import chalk from 'chalk';
import hasYarn from 'has-yarn';

enum Theme {
  success = '#a9dc76',
  moduleName = '#ab9df2',
  date = '#808080',
  debug = '#ffd866',

  // colors are taken from https://www.monokai.pro/
  // magenta: '#ff6188',
  // green: '#a9dc76',
  // yellow: '#ffd866',
  // orange: '#fc9867',
  // purple: '#ab9df2',
  // cyan: '#78dce8',
}

/* ================== logging ================== */
const cwd = nodeProcess.cwd();
const argv = minimist(nodeProcess.argv.slice(2));

const logDate = (): string =>
  chalk.hex(Theme.date)(`[${new Date().toISOString()}]`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debug = (...args: any[]): void => {
  if (argv.v || argv.verbose) {
    console.debug(logDate(), chalk.hex(Theme.debug)('DEBUG'), ...args);
  }
};

const log = (...args: string[]): void => {
  console.log(logDate(), ...args);
};

const logModuleName = chalk.hex(Theme.moduleName);

debug('arguments: ', argv);

const moduleNameByPath: { [key: string]: string } = {};
function getModuleNameForPath(path: string): string {
  if (!moduleNameByPath[path]) {
    moduleNameByPath[path] = require(`${cwd}/${path}/package.json`).name;
  }

  return moduleNameByPath[path];
}

function getModuleCommandForPath(path: string): string {
  const packageJson = JSON.parse(
    fs.readFileSync(`${cwd}/${path}/package.json`).toString()
  );
  if (packageJson['watch-module'] && packageJson['watch-module']['command']) {
    return packageJson['watch-module']['command'];
  }

  // no command override found
  const yarnOrNpm = hasYarn(path) ? 'yarn' : 'npm';

  return `${yarnOrNpm} run build`;
}

/* ================== build ================== */
function buildPath(path: string): void {
  const moduleName = getModuleNameForPath(path);
  log(logModuleName(moduleName), `Change detected`);

  debug(`Build "${moduleName}" package`);
  const command = getModuleCommandForPath(path);
  debug(`Command is "${command}"`);
  exec(
    command,
    {
      maxBuffer: 1024 * 500,
      cwd: path,
    },
    err => {
      if (err) {
        console.log(err);
        return;
      }
      debug(`Create module directory for "${moduleName}" and copy files`);
      const modulePath = `${cwd}/node_modules/${moduleName}`;
      return fs
        .ensureDir(modulePath)
        .then(() =>
          fs.copy(path, modulePath, {
            filter: (src: string) => {
              const srcAppendSlash = `${src}/`;

              return (
                !srcAppendSlash.startsWith(`${path}/node_modules/`) &&
                !srcAppendSlash.startsWith(`${path}/.git/`)
              );
            },
          })
        )
        .then(() => {
          log(
            logModuleName(moduleName),
            chalk.hex(Theme.success)('build done')
          );
        })
        .catch(console.error);
    }
  );
}

const changedModules: Set<string> = new Set();
function buildAll(): void {
  changedModules.forEach(buildPath);
  changedModules.clear();
}

/* ================== debounce & events ================== */
const debouncedOnChangeAll = debounce(buildAll, 200);

function onChange(modulePath: string): void {
  changedModules.add(modulePath);
  debouncedOnChangeAll();
}

/* ================== main ================== */
function main(): void {
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
