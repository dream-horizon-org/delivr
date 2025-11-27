/**
 * CommonJS wrapper to load ES module automate.js
 * Uses a child process to load the module completely outside Jest's context
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let automateModule = null;

async function loadAutomate() {
  if (automateModule) {
    return automateModule;
  }
  
  // Create a temporary script that loads automate.mjs and exports it
  const tempScript = path.resolve(__dirname, 'temp-module-loader.mjs');
  const automatePath = path.resolve(__dirname, 'automate.mjs').replace(/\\/g, '/');
  
  const scriptContent = `
    import * as mod from '${automatePath}';
    import { writeFileSync } from 'fs';
    import { fileURLToPath } from 'url';
    import { dirname } from 'path';
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // We can't serialize functions, so we'll create a proxy module
    // Instead, we'll use the actual import at runtime
    writeFileSync(__dirname + '/automate-loaded.txt', 'loaded');
    console.log('Automate module loaded successfully');
  `;
  
  fs.writeFileSync(tempScript, scriptContent);
  
  try {
    // Run the script in a separate Node process
    await new Promise((resolve, reject) => {
      const child = spawn('node', [tempScript], {
        cwd: __dirname,
        stdio: 'pipe'
      });
      
      let output = '';
      child.stdout.on('data', (data) => { output += data.toString(); });
      child.stderr.on('data', (data) => { output += data.toString(); });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Child process failed: ${output}`));
        }
      });
    });
    
    // Now try to import using the .mjs loader which should work
    const loaderPath = path.resolve(__dirname, 'load-automate.mjs');
    const { pathToFileURL } = require('url');
    const loaderUrl = pathToFileURL(loaderPath).href;
    
    // Use Function to prevent Jest from analyzing
    const importFunc = new Function('url', 'return import(url)');
    automateModule = await importFunc(loaderUrl);
    
  } catch (error) {
    // Fallback: try direct import with absolute file:// URL
    const { pathToFileURL } = require('url');
    const automateUrl = pathToFileURL(path.resolve(__dirname, 'automate.mjs')).href;
    const importFunc = new Function('url', 'return import(url)');
    automateModule = await importFunc(automateUrl);
  } finally {
    // Cleanup
    if (fs.existsSync(tempScript)) {
      fs.unlinkSync(tempScript);
    }
    const loadedFile = path.resolve(__dirname, 'automate-loaded.txt');
    if (fs.existsSync(loadedFile)) {
      fs.unlinkSync(loadedFile);
    }
  }
  
  return automateModule;
}

module.exports = { loadAutomate };

