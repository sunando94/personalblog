# Debugging Fix Summary

## Problem
Server-side breakpoints were not working ("Unbound breakpoint" error) when using the attach-mode debugging configuration.

## Root Cause
The issue was caused by using an **attach-mode** configuration instead of the **official Next.js recommended launch-mode** configuration. When using attach mode:
- Source maps may not be generated correctly from the start
- Timing issues can occur between server start and debugger attachment
- Manual port management is required

## Solution
Switched to the **official Next.js debugging configuration** using `node-terminal` type with launch mode.

### Changes Made

#### 1. Updated `.vscode/launch.json`
**Before (Attach Mode):**
```json
{
  "name": "Next.js: Server-Side",
  "type": "node",
  "request": "attach",
  "port": 9230,
  // ... complex configuration
}
```

**After (Launch Mode - Official Next.js):**
```json
{
  "name": "Next.js: debug server-side",
  "type": "node-terminal",
  "request": "launch",
  "command": "npm run dev -- --inspect"
}
```

#### 2. Simplified `next.config.mjs`
**Before:**
- Attempted to override `config.devtool` (caused warnings)
- Complex webpack configuration

**After:**
```javascript
webpack: (config, { dev, isServer }) => {
  if (dev && isServer) {
    // Only disable minification for better debugging
    config.optimization = {
      ...config.optimization,
      minimize: false,
    };
  }
  return config;
}
```

**Key insight:** Don't override `config.devtool` - Next.js handles source map generation automatically when started with `--inspect`.

#### 3. Updated Documentation
- Updated `docs/DEBUGGING.md` with official Next.js configuration
- Emphasized launch mode over attach mode
- Clarified that VS Code F5 is the recommended approach

## How to Use

### Quick Start (Recommended)
1. Press `F5` in VS Code
2. Select **"Next.js: debug server-side"** or **"Next.js: debug full stack"**
3. Set breakpoints in your TypeScript files
4. Navigate to trigger your code
5. Breakpoints will now work correctly! ✅

### Available Configurations
- **"Next.js: debug server-side"** - For API routes and Server Components
- **"Next.js: debug client-side"** - For client-side React components  
- **"Next.js: debug full stack"** - For debugging both server and client (auto-opens browser)

## Why This Works

1. **Launch Mode**: VS Code starts Next.js with debugging enabled from the very first line
2. **Official Configuration**: Uses Next.js's tested and maintained debugging setup
3. **Automatic Source Maps**: Next.js generates correct source maps when started with `--inspect`
4. **No Manual Port Management**: Everything is handled automatically by VS Code
5. **No Timing Issues**: Debugger is attached from the start, not after server startup

## Testing
To verify the fix works:

1. Open any server-side file (e.g., `src/app/api/admin/index-posts/route.ts`)
2. Set a breakpoint on any line
3. Press `F5` and select **"Next.js: debug server-side"**
4. Trigger the API route (e.g., navigate to the admin page)
5. The breakpoint should hit correctly in VS Code ✅

## References
- [Official Next.js Debugging Guide](https://nextjs.org/docs/app/building-your-application/configuring/debugging)
- [VS Code Node.js Debugging](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
