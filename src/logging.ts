import Theme from './theme.js';
import argv from './argv.js';
import EventEmitter from 'events';

type ModuleName = 'watch-module' | string;

export interface LogLine {
  date: Date;
  level: 'info' | 'debug' | 'error' | 'warn';
  moduleName: ModuleName;
  text: string;
  color?: Theme;
}

export interface InfoLogLine extends LogLine {
  level: 'info';
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
  public addLine(line: Omit<LogLine, 'date'>): void;
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
      level: 'debug',
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
    level: 'info',
    text: message,
    moduleName,
  });
};

export function error(moduleName: ModuleName, message: ModuleName): void {
  logLines?.addLine({
    level: 'error',
    moduleName,
    text: message,
    color: Theme.error,
  });
}

export function warn(moduleName: ModuleName, message: ModuleName): void {
  logLines?.addLine({
    level: 'warn',
    moduleName,
    text: message,
    color: Theme.warn,
  });
}
