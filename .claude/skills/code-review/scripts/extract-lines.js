#!/usr/bin/env node
/**
 * Extract specific line ranges from a file
 * Usage: node extract-lines.js "filename.js@10-50"
 *        node extract-lines.js "filename.js"
 */

const fs = require('fs');
const path = require('path');

function parseFileRange(input) {
  // Handle format: "filename@start-end" or just "filename"
  const match = input.match(/^(.+?)(?:@(\d+)-(\d+))?$/);
  
  if (!match) {
    throw new Error(`Invalid format: ${input}. Use filename or filename@start-end`);
  }
  
  const [, filepath, startStr, endStr] = match;
  
  return {
    filepath: filepath.trim(),
    start: startStr ? parseInt(startStr, 10) : null,
    end: endStr ? parseInt(endStr, 10) : null
  };
}

function extractLines(filepath, startLine, endLine) {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');
    
    if (startLine === null || endLine === null) {
      // Return entire file
      return lines.map((line, idx) => `${idx + 1}  ${line}`).join('\n');
    }
    
    // Validate line numbers
    if (startLine < 1 || endLine < startLine || endLine > lines.length) {
      throw new Error(
        `Invalid line range. File has ${lines.length} lines. ` +
        `Requested ${startLine}-${endLine}.`
      );
    }
    
    // Extract specified range (1-indexed)
    const extracted = lines.slice(startLine - 1, endLine);
    
    return extracted
      .map((line, idx) => `${startLine + idx}  ${line}`)
      .join('\n');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${filepath}`);
    }
    throw err;
  }
}

function main() {
  const input = process.argv[2];
  
  if (!input) {
    console.error('Usage: node extract-lines.js "filename" or "filename@10-50"');
    process.exit(1);
  }
  
  try {
    const { filepath, start, end } = parseFileRange(input);
    
    // Resolve relative to current working directory
    const fullPath = path.resolve(process.cwd(), filepath);
    
    const result = extractLines(fullPath, start, end);
    console.log(result);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
