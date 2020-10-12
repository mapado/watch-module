import nodeProcess from 'process';
import fs from 'fs-extra';
import { log } from './logging';
import defaultConfig from './default-config.json';
import { getModuleNameForPath } from './utils';

export const cwd = nodeProcess.cwd();

const CONFIG_FILE_NAME = 'watch-module.json';

let globalConfigCache: Config | null = null;
const moduleConfigCache: Config = {};

export type Config = {
  [key: string]: ConfigEntry;
};

export type ConfigEntry = {
  includes?: string[];
  excludes?: string[];
  command?: string;
};

export function getConfigPath(): string | void {
  const homeDir =
    process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  if (!homeDir) {
    return;
  }

  return `${homeDir}/.config`;
}

export function validateConfig(config: Config): void {
  if (!config.default || !config.default.includes) {
    throw new Error('Config must have one path in includes at minimum');
  }
}

export function getConfig(): Config {
  if (globalConfigCache) {
    return globalConfigCache;
  }
  const configPath = getConfigPath();
  if (!configPath) {
    return defaultConfig;
  }

  const configFilePath = `${configPath}/${CONFIG_FILE_NAME}`;

  if (!fs.existsSync(configFilePath)) {
    globalConfigCache = defaultConfig;
    return defaultConfig;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(configFilePath);

  if (!config.default) {
    config.default = defaultConfig.default;
  }
  validateConfig(config);
  globalConfigCache = config;
  return config;
}

export function getModuleConfigEntry(modulePath: string): ConfigEntry {
  const moduleName = getModuleNameForPath(modulePath);
  if (moduleConfigCache[moduleName]) {
    return moduleConfigCache[moduleName];
  }
  const packageJson = JSON.parse(
    fs.readFileSync(`${cwd}/${modulePath}/package.json`).toString()
  );

  // a command override is found in the package
  if (!packageJson['watch-module']) {
    const globalConfig = getConfig();
    const moduleConfig = globalConfig[moduleName] || globalConfig.default;
    moduleConfigCache[moduleName] = moduleConfig;
    return moduleConfig;
  }

  const moduleConfig = packageJson['watch-module'];
  if (typeof moduleConfig.includes === 'undefined') {
    moduleConfig.includes = ['src'];
  }
  moduleConfigCache[moduleName] = moduleConfig;
  return moduleConfig;
}

export function getIncludesPaths(modulePaths: string[]): string[] {
  const srcPaths: string[] = [];

  for (let i = 0; i < modulePaths.length; i++) {
    const path = modulePaths[i];

    const moduleConfig = getModuleConfigEntry(path);
    const moduleIncludes =
      moduleConfig.includes && Array.isArray(moduleConfig.includes)
        ? moduleConfig.includes
        : [];

    moduleIncludes.forEach(includePath => {
      let pathToAdd = `${path}/`;
      if (includePath && includePath !== '.') {
        pathToAdd = `${pathToAdd}${includePath}`;
      }
      if (!fs.existsSync(pathToAdd)) {
        return;
      }
      srcPaths.push(pathToAdd);
    });
  }
  return srcPaths;
}

export function getExcludesPaths(modulePaths: string[]): string[] {
  const srcPaths: string[] = [];
  for (let i = 0; i < modulePaths.length; i++) {
    const path = modulePaths[i];

    const moduleConfig = getModuleConfigEntry(path);

    const moduleExcludes =
      moduleConfig.excludes && Array.isArray(moduleConfig.excludes)
        ? moduleConfig.excludes
        : [];

    moduleExcludes.forEach(excludePath => {
      let pathToAdd = `${path}/`;
      if (excludePath && excludePath !== '.') {
        pathToAdd = `${pathToAdd}${excludePath}`;
      }
      if (!fs.existsSync(pathToAdd)) {
        return;
      }
      srcPaths.push(pathToAdd);
    });
  }
  return srcPaths;
}

export function createDefaultConfig(): void {
  const configPath = getConfigPath();
  if (!configPath) {
    return;
  }

  const configFilePath = `${configPath}/${CONFIG_FILE_NAME}`;
  if (fs.existsSync(configFilePath)) {
    return;
  }
  log('creating config file: ', configFilePath);
  fs.mkdirSync(configPath, { recursive: true });
  fs.copySync(`${__dirname}/default-config.json`, configFilePath);
}
