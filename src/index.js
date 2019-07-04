const { exec } = require('child_process');
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

function onChange(moduleName, path) {
  const yarnOrNpm = hasYarn(path) ? 'yarn' : 'npm';

  const command = `cd ${path} && ${yarnOrNpm} build && mkdir -p ${cwd}/node_modules/${moduleName} && rsync -r ${path}/* ${cwd}/node_modules/${moduleName} --exclude=.git --exclude=node_modules`;

  debug(`Executing command: "${command}"`);

  exec(
    command,
    { maxBuffer: 1024 * 500 },
    (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        return;
      }

      log(logModuleName(moduleName), chalk.hex(theme.success)('build done'));
    }
  );
}

const debouncedOnChange = debounce(onChange, 200);

function main() {
  const [ modulePath ] = argv._;

  if (!modulePath) {
    console.error("You must specify a module's path !!!");
    return;
  }

  // One-liner for current directory, ignores .dotfiles
  chokidar
    .watch(`${modulePath}/src`, { ignored: /(^|[\/\\])\.[^\.\/]/ })
    .on('all', (event, path) => {
      const moduleName = require(`${cwd}/${modulePath}/package.json`).name;

      log(logModuleName(moduleName), `Change detected: ${event} ${path}`);
      debouncedOnChange(moduleName, modulePath);
    });
}

main();
