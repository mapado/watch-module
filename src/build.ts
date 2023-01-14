import nodeProcess from 'process';
import { ChildProcess, exec } from 'child_process';
import fs from 'fs-extra';
import chalk from 'chalk';
import Theme from './theme.js';
import { debug, log } from './logging.js';
import { getModuleConfigEntry } from './config-utils.js';
import { getModuleNameForPath } from './utils.js';

export const cwd = nodeProcess.cwd();

/**
 * get the command to call for the package
 */
function getModuleCommandForPath(path: string): string | void {
  const moduleConfig = getModuleConfigEntry(path);
  return moduleConfig.command;
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
      log(moduleName, 'module swapped', Theme.success);
    })
    .catch(console.error);
}

const currentlyBuildingModules: Record<string, ChildProcess> = {};

/**
 * Trigger a build of the package
 */
export function buildPath(path: string): void {
  const moduleName = getModuleNameForPath(path);
  log(moduleName, 'Change detected');
  debug(`Build "${moduleName}" package`);

  if (currentlyBuildingModules[moduleName]) {
    debug(`kill old process for ${moduleName}...`);
    currentlyBuildingModules[moduleName].kill();
  }

  const command = getModuleCommandForPath(path);

  if (!command) {
    debug(`No command, copy files`);
    copyFiles(moduleName, path);
    return;
  }

  debug(`Command is "${command}", run and copy files`);

  currentlyBuildingModules[moduleName] = exec(
    command,
    {
      maxBuffer: 1024 * 500,
      cwd: path,
    },
    (err, stdout, stderr) => {
      if (err) {
        if (err.killed) {
          debug(`Old process for ${moduleName} killed.`);
        } else {
          log(moduleName, err.message, Theme.error);

          console.log(chalk.hex(Theme.warn)(stdout));
          console.log(chalk.hex(Theme.error)(stderr));
        }
        return;
      }

      // remove cache of previous build
      delete currentlyBuildingModules[moduleName];

      copyFiles(moduleName, path);
    }
  );
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
