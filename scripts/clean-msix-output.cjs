const fs = require('node:fs');
const path = require('node:path');

const packagePath = path.resolve(__dirname, '..', 'out', 'make', 'msix', 'x64', 'Everstep.msix');
fs.rmSync(packagePath, { force: true });
console.log('Previous MSIX output cleared.');
