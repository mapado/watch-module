import nodeProcess from 'process';
import { exec } from 'child_process';
import fs from 'fs-extra';
import hasYarn from 'has-yarn';
import chalk from 'chalk';
import Theme from './theme';
import { debug, log } from './logging';

export const cwd = nodeProcess.cwd();

const moduleNameByPath: { [key: string]: string } = {};

function getModuleNameForPath(path: string): string {
  if (!moduleNameByPath[path]) {
    moduleNameByPath[path] = require(`${cwd}/${path}/package.json`).name;
  }

  return moduleNameByPath[path];
}

/**
 * get the command to call for the package
 */
function getModuleCommandForPath(path: string): string {
  const packageJson = JSON.parse(
    fs.readFileSync(`${cwd}/${path}/package.json`).toString()
  );

  // a command override is found in the package
  if (packageJson['watch-module'] && packageJson['watch-module']['command']) {
    return packageJson['watch-module']['command'];
  }

  // no command override found
  const yarnOrNpm = hasYarn(path) ? 'yarn' : 'npm';

  return `${yarnOrNpm} run build`;
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

/**
 * Trigger a build of the package
 */
export function buildPath(path: string): void {
  const moduleName = getModuleNameForPath(path);
  log(moduleName, `Change detected`);
  debug(`Build "${moduleName}" package`);
  const command = getModuleCommandForPath(path);
  debug(`Command is "${command}"`);
  exec(
    command,
    {
      maxBuffer: 1024 * 500,
      cwd: path,
    },
    err => {
      if (err) {
        console.log(err);
        return;
      }

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
          log(moduleName, chalk.hex(Theme.success)('build done'));
        })
        .catch(console.error);
    }
  );
}

export function restoreOldDirectories(pathList: string[]): Promise<void>[] {
  return pathList.map(
    (path: string): Promise<void> => {
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
    }
  );
}
