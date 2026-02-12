// Copy assets from main site to viewer/dist after read-only build
// Note: index.html is now built correctly by the parent-portal itself
const fs = require('fs');
const path = require('path');

// Copy any additional assets if needed
// (Currently none required - parent-portal builds its own index.html)

console.log('Parent-portal build completed with correct index.html.');
