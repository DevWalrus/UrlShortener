#!/usr/bin/env node
/**
 * Run ESLint checks on Node.js files
 * Useful for identifying style and quality issues automatically
 * 
 * Usage:
 *   node check-node-lint.js filename.js
 *   node check-node-lint.js  (checks changed files)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getChangedJsFiles() {
  try {
    const output = execSync('git diff --name-only', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    return output
      .trim()
      .split('\n')
      .filter(file => file.match(/\.(js|ts)x?$/))
      .filter(file => file.startsWith('api/') || file.startsWith('src/') || file.startsWith('lib/'));
  } catch {
    return [];
  }
}

function runEslint(files) {
  if (files.length === 0) {
    console.log('No JavaScript/TypeScript files to lint.');
    return;
  }
  
  console.log(`Running ESLint on: ${files.join(', ')}`);
  console.log('');
  
  try {
    const result = execSync(`npx eslint ${files.join(' ')} --format=json`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    try {
      const lintResults = JSON.parse(result);
      
      if (lintResults.length === 0 || !lintResults[0].messages?.length) {
        console.log('✓ No ESLint issues found!');
        return;
      }
      
      // Format results nicely
      for (const fileResult of lintResults) {
        if (fileResult.messages.length === 0) continue;
        
        console.log(`\n📄 ${fileResult.filePath}`);
        
        for (const msg of fileResult.messages) {
          const severity = msg.severity === 2 ? '🔴' : '🟡';
          console.log(
            `  ${severity} Line ${msg.line}:${msg.column} - ${msg.message} (${msg.ruleId})`
          );
        }
      }
    } catch {
      console.log(result);
    }
  } catch (error) {
    const stderr = error.stderr?.toString() || error.message;
    
    // ESLint returns non-zero exit code if it found issues
    if (stderr.includes('ESLint')) {
      console.log(stderr);
    } else {
      console.error('Error running ESLint:', stderr);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  
  let filesToLint;
  
  if (args.length > 0) {
    // Lint specific files
    filesToLint = args;
  } else {
    // Lint changed files
    filesToLint = getChangedJsFiles();
  }
  
  runEslint(filesToLint);
}

main();
