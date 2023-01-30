import EventEmitter from 'node:events';
import argv from './argv.js';
import { WATCH_MODULE_DISPLAY_NAME } from './config-utils.js';
import Theme from './theme.js';

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

export function hasNextLineForModule(
  lines: LogLine[],
  index: number,
  moduleName: ModuleName
): boolean {
  return lines.slice(index + 1).some((l) => l.moduleName === moduleName);
}

export class LogLines {
  private lines: LogLine[] = [];

  #eventEmitter: EventEmitter;

  public constructor(eventEmitter: EventEmitter) {
    this.#eventEmitter = eventEmitter;
  }

  /**
   * Add a new line to the log
   *
   * @return the index of the inserted line
   */
  public addLine(line: Omit<LogLine, 'date'>): number {
    const newLength = this.lines.push({ ...line, date: new Date() });
    this.#eventEmitter.emit('newLogLine', line);

    return newLength - 1;
  }

  public replaceLastLogOrAdd(index: number, line: Omit<LogLine, 'date'>): void {
    if (hasNextLineForModule(this.lines, index, line.moduleName)) {
      this.addLine(line);
      return;
    }

    this.lines[index] = { ...line, date: new Date() };
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

function assertLoggerIsSet(
  innerLogLines: typeof logLines
): asserts innerLogLines is LogLines {
  if (!innerLogLines) {
    throw new Error('Logger is not set. This should not happen.');
  }
}

export function debug(moduleName: ModuleName, text: string): void {
  assertLoggerIsSet(logLines);

  if (argv.v || argv.verbose) {
    logLines.addLine({
      level: LOG_LEVEL.DEBUG,
      text,
      moduleName,
    });
  }
}

export function log(
  moduleName: string,
  message: ModuleName,
  color?: Theme
): number {
  assertLoggerIsSet(logLines);
  return logLines.addLine({
    color,
    level: LOG_LEVEL.INFO,
    text: message,
    moduleName,
  });
}

export function replaceLastLogOrAdd(
  moduleName: string,
  message: ModuleName,
  logLineNumber: number,
  color?: Theme
): void {
  assertLoggerIsSet(logLines);

  logLines.replaceLastLogOrAdd(logLineNumber, {
    color,
    level: LOG_LEVEL.INFO,
    text: message,
    moduleName,
  });
}

export function error(moduleName: ModuleName, message: ModuleName): number {
  assertLoggerIsSet(logLines);

  return logLines.addLine({
    level: LOG_LEVEL.ERROR,
    moduleName,
    text: message,
    color: Theme.error,
  });
}

export function warn(moduleName: ModuleName, message: ModuleName): number {
  assertLoggerIsSet(logLines);

  return logLines.addLine({
    level: LOG_LEVEL.WARN,
    moduleName,
    text: message,
    color: Theme.warn,
  });
}
