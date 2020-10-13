import nodeProcess from 'process';

export const cwd = nodeProcess.cwd();

const moduleNameByPath: { [key: string]: string } = {};

export function getModuleFullPath(path: string): string {
  return path.startsWith('/') ? `${path}` : `${cwd}/${path}`;
}

export function getModuleNameForPath(path: string): string {
  if (!moduleNameByPath[path]) {
    moduleNameByPath[path] = require(`${getModuleFullPath(
      path
    )}/package.json`).name;
  }

  return moduleNameByPath[path];
}
