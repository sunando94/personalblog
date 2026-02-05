// 1. SILENCE DOTENV IMMEDIATELY
// We must do this before importing ANYTHING that might trigger dotenv
import process from 'node:process';

// Redirect all stdout to stderr for this process
const originalStdoutWrite = process.stdout.write;
process.stdout.write = function(chunk, encoding, callback) {
  if (typeof chunk === 'string' && (chunk.includes('jsonrpc') || chunk.startsWith('{'))) {
    return originalStdoutWrite.apply(process.stdout, arguments);
  }
  return process.stderr.write.apply(process.stderr, arguments);
};

// Also redirect console.log
console.log = console.error;

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.mjs";

async function main() {
  // Use stderr for diagnostics
  process.stderr.write("Initializing Personal Blog MCP Server (Stdio)...\n");
  
  const server = createServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  process.stderr.write("Personal Blog MCP Server connected.\n");
}

main().catch((error) => {
  process.stderr.write(`MCP Server Fatal Error: ${error.stack || error}\n`);
  process.exit(1);
});
