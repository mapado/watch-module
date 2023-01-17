import nodeProcess from 'node:process';
import minimist from 'minimist';

const argv = minimist(nodeProcess.argv.slice(2));

export default argv;
