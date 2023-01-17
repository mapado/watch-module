/* eslint-disable @typescript-eslint/no-var-requires */
const { exec } = require('child_process');
const chokidar = require('chokidar');

let timeout = null;

function buildTimeout() {
  if (timeout) {
    clearTimeout(timeout);
  }

  timeout = setTimeout(() => {
    console.log('Building...');
    exec('yarn build', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      if (stdout) {
        console.log(stdout);
        console.log('build success');
      }

      if (stderr) {
        console.error(stderr);
      }
    });
  }, 50);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
chokidar.watch('src/**/*.(ts|tsx)').on('all', (event, path) => {
  buildTimeout();
});
