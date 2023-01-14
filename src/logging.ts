import chalk from 'chalk';
import Theme from './theme.js';
import argv from './argv.js';
import EventEmitter from 'events';

const logDate = (): string =>
  chalk.hex(Theme.date)(`[${new Date().toISOString()}]`);

export interface LogLine {
  text: string | string[];
  level: 'info' | 'debug';
  date: Date;
  color?: Theme;
}

export interface InfoLogLine extends LogLine {
  level: 'info';
  moduleName: string;
}

export interface DebugLogLine extends LogLine {
  level: 'debug';
}

export function isInfo(line: LogLine): line is InfoLogLine {
  return line.level === 'info';
}

export class LogLines {
  private lines: LogLine[] = [];

  #eventEmitter: EventEmitter;

  public constructor(eventEmitter: EventEmitter) {
    this.#eventEmitter = eventEmitter;
  }

  public addLine(line: Omit<InfoLogLine, 'date'>): void;
  public addLine(line: Omit<DebugLogLine, 'date'>): void;
  public addLine(line: Omit<LogLine, 'date'>): void {
    this.lines.push({ ...line, date: new Date() });
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
export const debug = (...args: string[]): void => {
  if (argv.v || argv.verbose) {
    // console.debug(logDate(), chalk.hex(Theme.debug)('DEBUG'), ...args);
    logLines?.addLine({
      level: 'debug',
      text: args,
    });
  }
};

const logModuleName = chalk.hex(Theme.moduleName);

export const log = (
  moduleName: string,
  message: string | string[],
  color?: Theme
): void => {
  // console.log(logDate(), logModuleName(moduleName), ...args);

  logLines?.addLine({
    color,
    level: 'info',
    text: message,
    moduleName,
  });
};
