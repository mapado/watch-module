import Theme from './theme.js';
import argv from './argv.js';
import EventEmitter from 'node:events';
import { WATCH_MODULE_DISPLAY_NAME } from './config-utils.js';

type ModuleName = typeof WATCH_MODULE_DISPLAY_NAME | string;

export enum LOG_LEVEL {
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  ERROR = 'ERROR',
  WARN = 'WARN',
}

export interface LogLine {
  date: Date;
  level: LOG_LEVEL;
  moduleName: ModuleName;
  text: string;
  color?: Theme;
}

export class LogLines {
  private lines: LogLine[] = [];

  #eventEmitter: EventEmitter;

  public constructor(eventEmitter: EventEmitter) {
    this.#eventEmitter = eventEmitter;
  }

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
export const debug = (moduleName: ModuleName, text: string): void => {
  if (argv.v || argv.verbose) {
    logLines?.addLine({
      level: LOG_LEVEL.DEBUG,
      text,
      moduleName,
    });
  }
};

export const log = (
  moduleName: string,
  message: ModuleName,
  color?: Theme
): void => {
  logLines?.addLine({
    color,
    level: LOG_LEVEL.INFO,
    text: message,
    moduleName,
  });
};

export function error(moduleName: ModuleName, message: ModuleName): void {
  logLines?.addLine({
    level: LOG_LEVEL.ERROR,
    moduleName,
    text: message,
    color: Theme.error,
  });
}

export function warn(moduleName: ModuleName, message: ModuleName): void {
  logLines?.addLine({
    level: LOG_LEVEL.WARN,
    moduleName,
    text: message,
    color: Theme.warn,
  });
}
