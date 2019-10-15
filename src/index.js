const { exec } = require('child_process');
const fs = require('fs-extra');
const debounce = require('debounce');
const chokidar = require('chokidar');
const minimist = require('minimist');
const chalk = require('chalk');
const process = require('process');
const hasYarn = require('has-yarn');

const theme = {
  success: '#a9dc76',
  moduleName: '#ab9df2',
  date: '#808080',
  debug: '#ffd866',

  // colors are taken from https://www.monokai.pro/
  // magenta: '#ff6188',
  // green: '#a9dc76',
  // yellow: '#ffd866',
  // orange: '#fc9867',
  // purple: '#ab9df2',
  // cyan: '#78dce8',
};

/* ================== logging ================== */
const cwd = process.cwd();
const argv = minimist(process.argv.slice(2));

const logDate = () => chalk.hex(theme.date)(`[${new Date().toISOString()}]`);

const debug = (...args) => {
  if (argv.v || argv.verbose) {
    console.debug(logDate(),  chalk.hex(theme.debug)('DEBUG'), ...args);
  }
}

const log = (...args) => {
  console.log(logDate(),  ...args);
}

const logModuleName = chalk.hex(theme.moduleName);

debug('arguments: ', argv);

const moduleNameByPath = {};
function getModuleNameForPath(path) {
  if (!moduleNameByPath[path]) {
      moduleNameByPath[path] = require(`${cwd}/${path}/package.json`).name;
  }

  return moduleNameByPath[path];
}

function getModuleCommandForPath(path) {
  const packageJson = require(`${cwd}/${path}/package.json`);
  if (packageJson['watch-module'] && packageJson['watch-module']['command']) {
    return packageJson['watch-module']['command'];
  }

  // no command override found
  const yarnOrNpm = hasYarn(path) ? 'yarn' : 'npm';

  return `${yarnOrNpm} run build`;
}

/* ================== build ================== */
const changedModules = new Set();
function buildAll() {
  changedModules.forEach(buildPath);
  changedModules.clear();
}

function buildPath(path) {
  const moduleName = getModuleNameForPath(path);
  log(logModuleName(moduleName), `Change detected`);

  const yarnOrNpm = hasYarn(path) ? 'yarn' : 'npm';

  debug(`Build "${moduleName}" package`);
  const command = getModuleCommandForPath(path);
  debug(`Command is "${command}"`);
  exec(
    command,
    {
      maxBuffer: 1024 * 500,
      cwd: path,
    },
    (err, stdout, stderr) => {
      if (err) {
        console.log(err);
      }
    }
  )

  debug(`Create module directory for "${moduleName}" and copy files`);
  const modulePath = `${cwd}/node_modules/${moduleName}`;
  fs
    .ensureDir(modulePath)
    .then(() => fs
      .copy(
        path,
        modulePath,
        {
          filter: (src, dest) => {
            const srcAppendSlash = `${src}/`;

            return !srcAppendSlash.startsWith(`${path}/node_modules/`)
              && !srcAppendSlash.startsWith(`${path}/.git/`)
          }
        }
      )
    )
    .then(() => {
      log(logModuleName(moduleName), chalk.hex(theme.success)('build done'));
    })
    .catch(console.error);
  ;
}

/* ================== debounce & events ================== */
const debouncedOnChangeAll = debounce(buildAll, 200);

function onChange(modulePath) {
  changedModules.add(modulePath);
  debouncedOnChangeAll();
}

/* ================== main ================== */
function main() {
  const modulePaths = argv._;

  if (modulePaths.length === 0) {
    console.error("You must specify a module's path !!!");
    return;
  }

  const srcPaths = modulePaths.map(path => `${path}/src`);

  // One-liner for current directory, ignores .dotfiles
  chokidar
    .watch(srcPaths, { ignored: /(^|[\/\\])\.[^\.\/]/ })
    .on('all', (event, path) => {
      const modulePath = modulePaths.find(tmpPath => path.startsWith(`${tmpPath}/`));

      onChange(modulePath);
    });
}

main();
