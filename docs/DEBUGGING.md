# Debugging Guide

This guide explains how to debug your Next.js blog application using VS Code with a secure, full-stack setup.

## Table of Contents

- [Quick Start](#quick-start)
- [VS Code Debug Configuration](#vs-code-debug-configuration)
- [Security Configuration](#security-configuration)
- [Debug Scripts](#debug-scripts)
- [Debugging Workflows](#debugging-workflows)
- [Debugging Tips](#debugging-tips)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Recommended: Using VS Code Debugger (Launch Mode)

1. **Start debugging with VS Code:**
   - Press `F5` in VS Code
   - Select: **"Next.js: debug server-side"** or **"Next.js: debug full stack"**
   - VS Code will automatically start Next.js with debugging enabled

2. **Debug server-side code:**
   - Set breakpoints in `.ts`, `.tsx` files (API routes, Server Components, etc.)
   - Add `debugger;` statements where needed
   - Navigate to trigger your code
   - Breakpoints will hit in VS Code!

3. **Debug client-side code:**
   - Use **"Next.js: debug client-side"** configuration
   - Or use **"Next.js: debug full stack"** to debug both at once
   - Browser will open automatically

### Alternative: Manual Debugging (Advanced)

If you prefer to start the server manually:

1. **Start Next.js with debugging enabled:**
   ```bash
   npm run dev:debug
   ```

2. **Use a custom attach configuration** (not included by default)

### Why This Setup Works

This configuration resolves **"Unbound breakpoint"** issues:
- **Launch mode with node-terminal** - Proper source map generation from the start
- **Official Next.js configuration** - Tested and maintained by the Next.js team
- **Automatic process management** - VS Code handles starting/stopping the server
- **Proper source maps** - Next.js generates correct source maps automatically

## VS Code Debug Configuration

### Recommended Configuration (Official Next.js)

The `.vscode/launch.json` file contains the official Next.js debugging configurations:

**1. Server-Side Debugging (Recommended)**

```json
{
  "name": "Next.js: debug server-side",
  "type": "node-terminal",
  "request": "launch",
  "command": "npm run dev -- --inspect"
}
```

**2. Client-Side Debugging**

```json
{
  "name": "Next.js: debug client-side",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3000"
}
```

**3. Full Stack Debugging (Best for Most Use Cases)**

```json
{
  "name": "Next.js: debug full stack",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/node_modules/next/dist/bin/next",
  "runtimeArgs": ["--inspect"],
  "skipFiles": ["<node_internals>/**"],
  "serverReadyAction": {
    "action": "debugWithChrome",
    "killOnServerStop": true,
    "pattern": "- Local:.+(https?://.+)",
    "uriFormat": "%s",
    "webRoot": "${workspaceFolder}"
  }
}
```

### How It Works

- **Launch mode** - VS Code starts Next.js with debugging enabled
- **Automatic source maps** - Next.js generates them correctly from the start
- **node-terminal type** - Integrates with VS Code's terminal for better output
- **serverReadyAction** - Automatically opens browser when server is ready (full stack mode)
- **No manual port management** - Everything is handled automatically

## Security Configuration

### Production-Safe Source Maps

**next.config.mjs** with environment-based security:

```javascript
const nextConfig = {
  // Only enable source maps in development for debugging
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',

  // Webpack configuration for debugging
  webpack: (config, { dev, isServer }) => {
    if (dev && isServer) {
      // Disable minification for server-side code in development
      // This ensures source maps work correctly with the debugger
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    }
    return config;
  },

  experimental: {
    forceSwcTransforms: true
  }
};
```

**Note:** You don't need to override `config.devtool` - Next.js handles source map generation automatically when you use the `--inspect` flag.

### Security Benefits

- ✅ **Development**: Source maps enabled for debugging
- ✅ **Production**: Source maps disabled (secure)
- ✅ **Debug ports**: Only active during development
- ✅ **No source exposure**: TypeScript code protected in production

### Security Verification

```bash
# Test production build security:
NODE_ENV=production npm run build
# Source maps will NOT be generated ✅

# Test development debugging:
npm run dev:debug
# Source maps WILL be generated for debugging ✅
```

## Debug Scripts

### Recommended: Use VS Code (F5)

**The easiest way to debug is to use VS Code's built-in debugger:**

1. Press `F5` in VS Code
2. Select a debug configuration:
   - **"Next.js: debug server-side"** - For API routes and Server Components
   - **"Next.js: debug client-side"** - For client-side React components
   - **"Next.js: debug full stack"** - For debugging both server and client

VS Code will automatically start Next.js with the correct flags and attach the debugger.

### Alternative: Manual Scripts (Advanced)

If you prefer to start the server manually (not recommended for most users):

```bash
# Standard development (no debugger)
npm run dev

# Development with debugger (requires manual attach)
npm run dev:debug

# Development with debugger, breaks on first line
npm run dev:debug-brk
```

### Production Scripts (Secure)

```bash
# Production build (no debug features)
npm run build

# Production server (secure)
npm run start

# Production server with debugger (only use if needed)
npm run start:debug
```

### Script Details

```json
{
  "dev": "next dev",
  "dev:debug": "NODE_OPTIONS='--inspect' next dev --webpack",
  "dev:debug-brk": "NODE_OPTIONS='--inspect-brk' next dev",
  "build": "next build",
  "start": "next start",
  "start:debug": "NODE_OPTIONS='--inspect' next start"
}
```

**Important:**
- **Recommended**: Use VS Code's F5 debugger (uses the official Next.js configuration)
- **Manual scripts**: Only needed if you want to attach a debugger manually
- **Never run debug scripts in production** (exposes debug ports)

## Debugging Workflows

### Manual Full-Stack Workflow

**Step 1: Start server**
```bash
npm run dev:debug
```

**Step 2: Attach debugger**
```
VS Code: Press F5 → "Next.js: Full Stack"
```

**Step 3: Debug based on component type**

### Server Component Debugging

**For server-side TSX files (no "use client"):**

```typescript
// src/app/posts/[slug]/page.tsx
export default async function Post(props: Params) {
  debugger; // ✅ Pauses in VS Code
  const post = getPostBySlug(params.slug);
  console.log("Server variables:", { post }); // Shows in VS Code Debug Console
  return <div>{post.title}</div>;
}
```

**How to debug:**
1. Set breakpoints or add `debugger;`
2. Navigate to page in browser
3. Debugger pauses in VS Code
4. Inspect variables in Debug panel

### Client Component Debugging

**For client-side TSX files (has "use client"):**

```typescript
// src/app/_components/VectorsTabContent.tsx
"use client";

export default function VectorsTabContent() {
  debugger; // ✅ Pauses in Chrome DevTools (when browser is open)
  const [posts, setPosts] = useState([]);
  console.log("Client state:", { posts }); // Shows in Browser Console
  return <div>{posts.length} posts</div>;
}
```

**How to debug:**
1. Manually open `http://localhost:3000`
2. Press `F12` for DevTools
3. Navigate to trigger component
4. Debugger pauses in Chrome DevTools

### API Route Debugging

**For server-side API routes:**

```typescript
// src/app/api/admin/analytics/route.ts
export async function GET() {
  debugger; // ✅ Pauses in VS Code
  const data = await getAnalytics();
  return Response.json(data);
}
```

**How to debug:**
1. Set breakpoints in API route
2. Make HTTP request (browser, curl, etc.)
3. Debugger pauses in VS Code

### Database/AI Integration Debugging

```typescript
// src/lib/db.ts or src/lib/embedding-service.ts
export async function getEmbeddings() {
  debugger; // ✅ Pauses in VS Code
  const results = await query('SELECT * FROM embeddings');
  return results;
}
```

## Debugging Tips

### Using debugger; Statement

**Always works, regardless of source map issues:**

```typescript
export default function MyComponent() {
  debugger; // Always pauses execution
  // ... your code
}
```

### Setting Breakpoints

**VS Code (Server-side):**
- Click in gutter (left of line numbers)
- Right-click for conditional breakpoints
- Add to Watch panel for variable inspection

**Chrome DevTools (Client-side):**
- Sources tab → Navigate to file
- Click line numbers to set breakpoints
- Use React Developer Tools for component state

### Inspecting Variables

**VS Code Debug Console:**
```javascript
// Type these in Debug Console while paused:
JSON.stringify(post, null, 2)
Object.keys(request.headers)
process.env.NODE_ENV
```

**Chrome DevTools Console:**
```javascript
// Client-side inspection:
$0 // Currently selected DOM element
React.version
window.location
```

## Troubleshooting

### "Unbound breakpoint" Issue

**Root Cause:**
The debugger cannot map your TypeScript source files to the compiled JavaScript because source maps are missing or incorrectly configured.

**✅ Solution (implemented in this setup):**

1. **Use the official Next.js configuration** with `node-terminal` type:
   ```json
   {
     "name": "Next.js: debug server-side",
     "type": "node-terminal",
     "request": "launch",
     "command": "npm run dev -- --inspect"
   }
   ```

2. **Use launch mode instead of attach mode**:
   - Launch mode: VS Code starts Next.js with proper debugging from the start
   - Attach mode: Requires manual server start and can have source map issues

3. **Let Next.js handle source maps**:
   - Don't override `config.devtool` in `next.config.mjs`
   - Next.js automatically generates correct source maps with `--inspect`

4. **Clean rebuild if migrating from old setup**:
   ```bash
   rm -rf .next
   # Then press F5 in VS Code to start debugging
   ```

**Why this works:**
- Next.js knows how to generate source maps correctly when started with `--inspect`
- Launch mode ensures debugging is enabled from the very first line of code
- No manual port management or timing issues

### Common Issues

**1. Debugger not attaching:**
```bash
# Check if process is running:
lsof -i :9230

# Restart if needed:
npm run dev:debug
```

**2. Breakpoints not hitting:**
- Wait for file compilation
- Use `debugger;` statement
- Verify code actually executes (add `console.log`)

**3. Port conflicts:**
```bash
# Kill conflicting process:
lsof -i :9230
kill -9 <PID>
```

**4. Source maps not working:**
```bash
# Clean rebuild:
rm -rf .next
npm run dev:debug
```

### Environment Issues

**Development vs Production:**
- Development: All debugging features enabled
- Production: All debugging features disabled for security
- Always verify with `NODE_ENV=production npm run build`

## Advanced Features

### Remote Debugging

**For staging/production debugging (use carefully):**

1. Enable debug port in secure environment
2. Use SSH tunneling for port forwarding
3. Never expose debug ports publicly

### Performance Profiling

1. Start debug session
2. Use Chrome DevTools Performance tab
3. Record and analyze CPU usage
4. Optimize based on findings

## Resources

- [VS Code Debugging Docs](https://code.visualstudio.com/docs/editor/debugging)
- [Next.js Debugging Guide](https://nextjs.org/docs/app/building-your-application/configuring/debugging)
- [Chrome DevTools Guide](https://developer.chrome.com/docs/devtools/)
- [Node.js Inspector](https://nodejs.org/en/docs/guides/debugging-getting-started/)

## Getting Help

**If debugging issues persist:**

1. Check VS Code "Output" → "Debugger"
2. Review Debug Console for errors
3. Verify terminal shows no errors
4. Test with minimal `debugger;` statement

---

**Manual, secure, full-stack debugging ready!** 🔒✨