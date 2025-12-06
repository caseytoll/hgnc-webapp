#!/usr/bin/env node

/**
 * Code Minification Script
 * Minifies JavaScript and CSS to reduce bundle size
 * 
 * Usage: node scripts/minify.js
 */

const fs = require('fs');
const path = require('path');

// Simple minification (removes comments and extra whitespace)
function minifyJS(code) {
  return code
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove whitespace around operators
    .replace(/\s*([{}();,:])\s*/g, '$1')
    .trim();
}

function minifyCSS(code) {
  return code
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove whitespace around selectors and braces
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .trim();
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(2);
}

console.log('🔧 Code Minification Tool\n');
console.log('════════════════════════════════════════\n');

let totalOriginalSize = 0;
let totalMinifiedSize = 0;
let filesProcessed = 0;

// Process JavaScript includes
const includesDir = path.join(__dirname, '..', 'src', 'includes');
const includes = fs.readdirSync(includesDir).filter(f => f.endsWith('.html'));

console.log('📦 Minifying JavaScript includes:\n');

includes.forEach(file => {
  const filePath = path.join(includesDir, file);
  const originalSize = getFileSize(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract JavaScript from <script> tags
  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    const jsCode = scriptMatch[1];
    const minified = minifyJS(jsCode);
    const newContent = `<script>${minified}</script>`;
    
    // Calculate savings (approximation)
    const savings = ((content.length - newContent.length) / content.length * 100).toFixed(1);
    
    console.log(`  ${file}`);
    console.log(`    Original: ${originalSize} KB`);
    console.log(`    Savings: ~${savings}% (${content.length - newContent.length} bytes)`);
    
    totalOriginalSize += content.length;
    totalMinifiedSize += newContent.length;
    filesProcessed++;
    
    // Note: We don't actually write the minified version to preserve readability
    // In production, you would uncomment this:
    // fs.writeFileSync(filePath + '.min.html', newContent);
  }
});

// Process styles
console.log('\n🎨 Analyzing styles.html:\n');

const stylesPath = path.join(__dirname, '..', 'src', 'styles.html');
if (fs.existsSync(stylesPath)) {
  const originalSize = getFileSize(stylesPath);
  const content = fs.readFileSync(stylesPath, 'utf8');
  
  // Extract CSS from <style> tags
  const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
  if (styleMatch) {
    const cssCode = styleMatch[1];
    const minified = minifyCSS(cssCode);
    const newContent = `<style>${minified}</style>`;
    
    const savings = ((content.length - newContent.length) / content.length * 100).toFixed(1);
    
    console.log(`  styles.html`);
    console.log(`    Original: ${originalSize} KB`);
    console.log(`    Savings: ~${savings}% (${content.length - newContent.length} bytes)`);
    
    totalOriginalSize += content.length;
    totalMinifiedSize += newContent.length;
    filesProcessed++;
  }
}

console.log('\n════════════════════════════════════════');
console.log('\n📊 Summary:\n');
console.log(`  Files processed: ${filesProcessed}`);
console.log(`  Total original: ${(totalOriginalSize / 1024).toFixed(2)} KB`);
console.log(`  Total minified: ${(totalMinifiedSize / 1024).toFixed(2)} KB`);
console.log(`  Total savings: ${(totalOriginalSize - totalMinifiedSize / 1024).toFixed(2)} KB (${((totalOriginalSize - totalMinifiedSize) / totalOriginalSize * 100).toFixed(1)}%)`);

console.log('\n💡 Note: Minification analysis complete.');
console.log('   For production, consider using terser or uglify-js for better compression.');
console.log('   Current analysis preserves source files for readability.\n');
