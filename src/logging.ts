import Theme from './theme.js';
import argv from './argv.js';
import EventEmitter from 'events';

export interface LogLine {
  text: string | string[];
  level: 'info' | 'debug' | 'error' | 'warn';
  date: Date;
  color?: Theme;
}

export interface InfoLogLine extends LogLine {
  level: 'info';
  moduleName: string;
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
export const debug = (...args: string[]): void => {
  if (argv.v || argv.verbose) {
    logLines?.addLine({
      level: 'debug',
      text: args,
    });
  }
};

export const log = (
  moduleName: string,
  message: string | string[],
  color?: Theme
): void => {
  logLines?.addLine({
    color,
    level: 'info',
    text: message,
    moduleName,
  });
};

export function error(message: string): void {
  logLines?.addLine({
    level: 'error',
    text: message,
    color: Theme.error,
  });
}

export function warn(message: string): void {
  logLines?.addLine({
    level: 'warn',
    text: message,
    color: Theme.warn,
  });
}
