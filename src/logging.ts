import chalk from 'chalk';
import Theme from './theme';
import argv from './argv';

const logDate = (): string =>
  chalk.hex(Theme.date)(`[${new Date().toISOString()}]`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debug = (...args: any[]): void => {
  if (argv.v || argv.verbose) {
    console.debug(logDate(), chalk.hex(Theme.debug)('DEBUG'), ...args);
  }
};

const logModuleName = chalk.hex(Theme.moduleName);

export const log = (moduleName: string, ...args: string[]): void => {
  console.log(logDate(), logModuleName(moduleName), ...args);
};
