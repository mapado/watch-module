import chalk from 'chalk';
import Theme from './theme.js';
import argv from './argv.js';
import EventEmitter from 'events';

const logDate = (): string =>
  chalk.hex(Theme.date)(`[${new Date().toISOString()}]`);

export type LogLine = {
  text: string;
  type: 'log' | 'debug';
};

export class LogLines {
  private lines: LogLine[] = [];

  #eventEmitter: EventEmitter;

  public constructor(eventEmitter: EventEmitter) {
    this.#eventEmitter = eventEmitter;
  }

  public addLine(line: LogLine): void {
    this.lines.push(line);
    this.#eventEmitter.emit('newLogLine', line);
  }

  public getLines(): LogLine[] {
    return this.lines;
  }
}

let logLines: LogLines | undefined;

export function createLogger(eventEmitter: EventEmitter): LogLines {
  logLines = new LogLines(eventEmitter);

  return logLines;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debug = (...args: any[]): void => {
  if (argv.v || argv.verbose) {
    // console.debug(logDate(), chalk.hex(Theme.debug)('DEBUG'), ...args);
    logLines?.addLine({
      type: 'debug',
      text: [logDate(), chalk.hex(Theme.debug)('DEBUG'), ...args].join(' '),
    });
  }
};

const logModuleName = chalk.hex(Theme.moduleName);

export const log = (moduleName: string, ...args: string[]): void => {
  // console.log(logDate(), logModuleName(moduleName), ...args);

  logLines?.addLine({
    type: 'log',
    text: [logDate(), logModuleName(moduleName), ...args].join(' '),
  });
};
