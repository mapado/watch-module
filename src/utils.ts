import crypto from 'node:crypto';
import nodeProcess from 'node:process';
import fs from 'fs-extra';

export const cwd = nodeProcess.cwd();

const moduleNameByPath: { [key: string]: string } = {};

export function getModuleFullPath(path: string): string {
  return path.startsWith('/') ? `${path}` : `${cwd}/${path}`;
}

export function getModuleNameForPath(path: string): string {
  if (!moduleNameByPath[path]) {
    const fullPath = `${getModuleFullPath(path)}/package.json`;
    const packageJsonContent = fs.readFileSync(fullPath, {
      encoding: 'utf8',
    });
    const packageJson = JSON.parse(packageJsonContent);
    moduleNameByPath[path] = packageJson.name;
  }

  return moduleNameByPath[path];
}

export function getFileHash(path: string): string {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path))
    .digest('hex');
}
