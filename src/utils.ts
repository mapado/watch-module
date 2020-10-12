import nodeProcess from 'process';

export const cwd = nodeProcess.cwd();

const moduleNameByPath: { [key: string]: string } = {};

export function getModuleNameForPath(path: string): string {
  if (!moduleNameByPath[path]) {
    moduleNameByPath[path] = require(`${cwd}/${path}/package.json`).name;
  }

  return moduleNameByPath[path];
}
