import fs from 'fs-extra';
import hasYarn from 'has-yarn';
import { log } from './logging.js';
import Theme from './theme.js';
import { getModuleNameForPath, getModuleFullPath } from './utils.js';

const CONFIG_FILE_NAME = 'watch-module.json';
const CONFIG_PATH = '.config/watch-module';

let globalConfigCache: Config | null = null;
const moduleConfigCache: Config = {};

type Config = {
  [key: string]: ConfigEntry;
};

type ConfigEntry = {
  includes?: string[];
  excludes?: string[];
  command?: string | null;
};

function getGlobalConfigPath(): string | void {
  const homeDir =
    process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  if (!homeDir) {
    return;
  }

  return `${homeDir}/${CONFIG_PATH}`;
}

function createDefaultConfig(): void {
  const configPath = getGlobalConfigPath();
  if (!configPath) {
    return;
  }

  if (fs.existsSync(`${configPath}/${CONFIG_FILE_NAME}`)) {
    return;
  }
  log(
    'watch-module',
    `creating config file: ${configPath}/${CONFIG_FILE_NAME}`
  );
  fs.mkdirSync(configPath, { recursive: true });
  fs.closeSync(fs.openSync(`${configPath}/${CONFIG_FILE_NAME}`, 'w'));
}

function getGlobalConfig(): Config {
  if (globalConfigCache) {
    return globalConfigCache;
  }

  createDefaultConfig();

  let config = {};
  const configPath = getGlobalConfigPath();
  if (!configPath || !fs.existsSync(`${configPath}/${CONFIG_FILE_NAME}`)) {
    globalConfigCache = config;
    return config;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    config = JSON.parse(
      fs.readFileSync(`${configPath}/${CONFIG_FILE_NAME}`, { encoding: 'utf8' })
    );
  } catch (e) {} //eslint-disable-line no-empty

  globalConfigCache = config;
  return config;
}

/**
 * get the config for a specipfic module identified by modulePath
 * returns
 *    module's package.json's watch-module entry content
 *    or
 *    user's config's module entry
 *    or
 *    default config entry
 */
export function getModuleConfigEntry(modulePath: string): ConfigEntry {
  const moduleName = getModuleNameForPath(modulePath);
  if (moduleConfigCache[moduleName]) {
    return moduleConfigCache[moduleName];
  }
  const packageJson = JSON.parse(
    fs.readFileSync(`${getModuleFullPath(modulePath)}/package.json`).toString()
  );

  const yarnOrNpm = hasYarn(modulePath) ? 'yarn' : 'npm';
  const defaultConfig: ConfigEntry = {
    includes: ['src'],
    command: `${yarnOrNpm} run build`,
  };

  if (packageJson['watch-module']) {
    // a watch-module config is found in the package
    const packageJsonConfig: ConfigEntry = {
      ...defaultConfig,
      ...packageJson['watch-module'],
    };
    moduleConfigCache[moduleName] = packageJsonConfig;
    log(moduleName, 'using package.json config', Theme.info);

    return packageJsonConfig;
  }

  const globalConfig = getGlobalConfig();
  if (globalConfig[moduleName]) {
    // a config for this module is found in the global config

    const globalConfigWithDefault: ConfigEntry = {
      ...defaultConfig,
      ...globalConfig[moduleName],
    };

    moduleConfigCache[moduleName] = globalConfigWithDefault;
    log(moduleName, 'using global config', Theme.info);

    return globalConfigWithDefault;
  }

  // no config was found, return default config
  moduleConfigCache[moduleName] = defaultConfig;
  log(moduleName, 'using default config', Theme.info);

  return defaultConfig;
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

    moduleIncludes.forEach((includePath) => {
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

    moduleExcludes.forEach((excludePath) => {
      let pathToAdd = `${path}/`;

      if (excludePath && excludePath !== '.') {
        pathToAdd = `${pathToAdd}${excludePath.replace(/\/+$/, '')}`;
      }

      if (!fs.existsSync(pathToAdd)) {
        return;
      }

      srcPaths.push(pathToAdd);
    });
  }

  return srcPaths;
}
