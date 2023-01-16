import nodeProcess from 'process';
import { ChildProcess, PromiseWithChild, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import chalk from 'chalk';
import minimatch from 'minimatch';
import Theme from './theme.js';
import { debug, log } from './logging.js';
import { getModuleConfigEntry } from './config-utils.js';
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

  console.log(Object.keys(moduleConfig.command), Array.from(pathSet));

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

  debug(`Create backup directory for "${moduleName}" and save files`);

  // copy dir to backup version
  if (fs.existsSync(modulePath) && fs.statSync(modulePath).isDirectory()) {
    fs.copySync(modulePath, backupPath);
  }
}

function copyFiles(moduleName: string, path: string): Promise<void> {
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
      log(moduleName, chalk.hex(Theme.success)('module swapped'));
    })
    .catch(console.error);
}

const currentlyBuildingModules: Record<string, AbortController> = {};

/**
 * Trigger a build of the package
 */
export function buildModule(modulePath: string, pathsSet: Set<string>): void {
  const moduleName = getModuleNameForPath(modulePath);
  log(moduleName, 'Change detected');
  console.log(pathsSet);
  debug(`Build "${moduleName}" package`);

  if (currentlyBuildingModules[moduleName]) {
    debug(`kill old process for ${moduleName}...`);
    currentlyBuildingModules[moduleName].abort();
  }

  console.log(modulePath);
  const commands = getModuleCommandsForPath(modulePath, pathsSet);

  if (!commands || commands.length === 0) {
    debug(`No command, copy files`);
    copyFiles(moduleName, modulePath);
    return;
  }

  if (commands.length > 1) {
    debug(`Command are "${commands.join(', ')}", run and copy files`);
  } else {
    debug(`Command is "${commands[0]}", run and copy files`);
  }

  const controller = new AbortController();

  const childProcesses = commands.map((command) =>
    execAsync(
      command,
      {
        maxBuffer: 1024 * 500,
        cwd: modulePath,
        signal: controller.signal,
      }
      // (err, stdout, stderr) => {
      //   if (err) {
      //     if (err.killed) {
      //       debug(`Old process for ${moduleName} killed.`);
      //     } else {
      //       log(moduleName, chalk.hex(Theme.error)(err.message));

      //       console.log(chalk.hex(Theme.warn)(stdout));
      //       console.log(chalk.hex(Theme.error)(stderr));
      //     }
      //     return;
      //   }

      //   // remove cache of previous build
      //   delete currentlyBuildingModules[moduleName];

      //   copyFiles(moduleName, modulePath);
      // }
    )
  );

  Promise.allSettled(childProcesses).then((results) => {
    let someAreRejected = false;

    for (const result of results) {
      if (result.status === 'rejected') {
        someAreRejected = true;

        if (result.reason.killed) {
          debug(`Old process for ${moduleName} killed.`);
        } else {
          log(moduleName, chalk.hex(Theme.error)(result.reason.message));

          console.log(chalk.hex(Theme.warn)(result.reason.stdout));
          console.log(chalk.hex(Theme.error)(result.reason.stderr));
        }
        return;
      }
    }

    // remove cache of previous build
    delete currentlyBuildingModules[moduleName];

    if (!someAreRejected) {
      copyFiles(moduleName, modulePath);
    }
  });

  currentlyBuildingModules[moduleName] = controller;
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
