import { exec } from 'node:child_process';
import nodeProcess from 'node:process';
import { promisify } from 'node:util';
import fs from 'fs-extra';
import minimatch from 'minimatch';
import { getModuleConfigEntry } from './config-utils.js';
import { debug, log, replaceLastLogOrAdd } from './logging.js';
import Theme from './theme.js';
import { getModuleNameForPath } from './utils.js';

const execAsync = promisify(exec);

export const cwd = nodeProcess.cwd();

/**
 * get the command to call for the package
 */
function getModuleCommandsForPath(
  path: string,
  pathSet: Set<string>
): string[] | void {
  const moduleConfig = getModuleConfigEntry(path);

  if (!moduleConfig.command) {
    return;
  }

  if (typeof moduleConfig.command === 'string') {
    return [moduleConfig.command];
  }

  const matchedCommands = Object.entries(moduleConfig.command)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([pattern, _command]) => {
      return (
        minimatch.match(Array.from(pathSet), pattern, { matchBase: true })
          .length > 0
      );
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(([_pattern, command]) => command);

  return matchedCommands;
}

const getNodeModulepath = (moduleName: string): string =>
  `${cwd}/node_modules/${moduleName}`;

function backupModule(moduleName: string, modulePath: string): void {
  const backupPath = `${modulePath}.bak`;

  if (fs.existsSync(backupPath)) {
    // do not backup if an old backup already exists
    return;
  }

  debug(
    moduleName,
    `Create backup directory for "${moduleName}" and save files`
  );

  // copy dir to backup version
  if (fs.existsSync(modulePath) && fs.statSync(modulePath).isDirectory()) {
    fs.copySync(modulePath, backupPath);
  }
}

function copyFiles(
  moduleName: string,
  path: string,
  replaceLogLine: number
): Promise<void> {
  const modulePath = getNodeModulepath(moduleName);
  backupModule(moduleName, modulePath);

  return fs
    .ensureDir(modulePath)
    .then(() =>
      fs.copy(path, modulePath, {
        filter: (src: string) => {
          const srcAppendSlash = `${src}/`;
          return (
            !srcAppendSlash.startsWith(`${path}/node_modules/`) &&
            !srcAppendSlash.startsWith(`${path}/.git/`)
          );
        },
      })
    )
    .then(() =>
      fs.writeFile(
        `${modulePath}/IS_UNDER_WATCH_MODULE`,
        'IS_UNDER_WATCH_MODULE'
      )
    )
    .then(() => {
      replaceLastLogOrAdd(
        moduleName,
        'module swapped',
        replaceLogLine,
        Theme.success
      );
    })
    .catch(console.error);
}

// TODO move into a proper file and use it in the other files instead of "string"
type ModuleName = string;
type Command = string;

const currentlyBuildingModules: Record<
  ModuleName,
  Record<
    Command,
    { abortController: AbortController; process: ReturnType<typeof execAsync> }
  >
> = {};

/**
 * Trigger a build of the package
 */
export function buildModule(modulePath: string, pathsSet: Set<string>): void {
  const moduleName = getModuleNameForPath(modulePath);
  const changeLogLine = log(moduleName, 'Change detected, building…');
  debug(moduleName, `Build "${moduleName}" package`);

  const commands = getModuleCommandsForPath(modulePath, pathsSet);

  if (!commands || commands.length === 0) {
    debug(moduleName, `No command, copy files`);
    copyFiles(moduleName, modulePath, changeLogLine);
    return;
  }

  if (currentlyBuildingModules[moduleName]) {
    debug(moduleName, `kill old process for ${moduleName}...`);

    commands.forEach((command) => {
      if (currentlyBuildingModules[moduleName][command]) {
        currentlyBuildingModules[moduleName][command].abortController.abort();
        delete currentlyBuildingModules[moduleName][command];
      }
    });
  }

  if (commands.length > 1) {
    debug(
      moduleName,
      `Command are "${commands.join(', ')}", run and copy files`
    );
  } else {
    debug(moduleName, `Command is "${commands[0]}", run and copy files`);
  }

  commands.forEach((command: string): void => {
    const controller = new AbortController();

    if (!currentlyBuildingModules[moduleName]) {
      currentlyBuildingModules[moduleName] = {};
    }

    const process = execAsync(command, {
      maxBuffer: 1024 * 500,
      cwd: modulePath,
      signal: controller.signal,
    });

    currentlyBuildingModules[moduleName][command] = {
      abortController: controller,
      process,
    };
  });

  const promiseList = Object.values(currentlyBuildingModules[moduleName]).map(
    ({ process }) => process
  );

  Promise.allSettled(promiseList).then((results) => {
    let someAreRejected = false;

    for (const result of results) {
      if (result.status === 'rejected') {
        someAreRejected = true;

        if (result.reason.killed) {
          debug(moduleName, `Old process for ${moduleName} killed.`);
        } else {
          replaceLastLogOrAdd(
            moduleName,
            result.reason.message,
            changeLogLine,
            Theme.error
          );

          log(moduleName, result.reason.stdout, Theme.warn);
          log(moduleName, result.reason.stderr, Theme.error);
        }
        return;
      }
    }

    // remove cache of previous build
    delete currentlyBuildingModules[moduleName];

    if (!someAreRejected) {
      copyFiles(moduleName, modulePath, changeLogLine);
    }
  });
}

export function restoreOldDirectories(pathList: string[]): Promise<void>[] {
  return pathList.map((path: string): Promise<void> => {
    const moduleName = getModuleNameForPath(path);
    const nodePath = getNodeModulepath(moduleName);
    const nodePathBak = `${nodePath}.bak`;

    if (
      !fs.existsSync(nodePathBak) ||
      !fs.statSync(nodePathBak).isDirectory()
    ) {
      return Promise.resolve();
    }

    return fs
      .remove(nodePath)
      .then(() => fs.copy(nodePathBak, nodePath))
      .then(() => fs.remove(nodePathBak));
  });
}
