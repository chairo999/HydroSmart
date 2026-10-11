const { spawn } = require('child_process');

console.log('═══════════════════════════════════════════════');
console.log('  Starting HydroSmart Full Development Stack  ');
console.log('  • Backend API & Simulator  : http://localhost:5000');
console.log('  • Frontend Live Dashboard  : http://localhost:5173');
console.log('═══════════════════════════════════════════════');

const backend = spawn('node', ['backend/server.js'], { stdio: 'inherit', shell: true });
const frontend = spawn('npm', ['run', 'dev', '--prefix', 'frontend'], { stdio: 'inherit', shell: true });

function cleanup() {
  backend.kill();
  frontend.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
