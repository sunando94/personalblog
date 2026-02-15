# Step-by-Step: Debug the POST /api/admin/index-posts Endpoint

## Current Situation
- You have the file `src/app/api/admin/index-posts/route.ts` open
- You want to debug the POST method (line 39+)
- You're getting "Unbound breakpoint" errors

## The Problem
You were running **both**:
1. `npm run dev:debug` manually in terminal (WRONG for launch mode)
2. "Next.js: debug full stack" from VS Code (CORRECT)

These conflict with each other!

## ✅ Correct Steps to Debug

### Step 1: Make Sure No Manual Server is Running
I've already killed any running Next.js processes for you.

**Verify**: Check your terminal - `npm run dev:debug` should be stopped.

### Step 2: Start Debugging with VS Code
1. **Press `F5`** in VS Code
2. **Select**: `Next.js: debug full stack`
3. **Wait** for the server to start (you'll see "Ready" in the terminal)
4. **Browser will auto-open** to http://localhost:3000

### Step 3: Set Your Breakpoint
1. Go to line 40 in `route.ts` (the `debugger;` line I just added)
2. Click in the gutter to add a breakpoint (or just rely on the `debugger;` statement)

### Step 4: Trigger the POST Request
You need to make a POST request to `/api/admin/index-posts`. You can do this by:

**Option A: Use the Admin UI**
1. Navigate to http://localhost:3000/admin
2. Go to the "Vectors" tab
3. Click "Sync All Posts" or "Sync Single Post"

**Option B: Use curl**
```bash
curl -X POST http://localhost:3000/api/admin/index-posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{}'
```

**Option C: Use VS Code REST Client**
Create a file `test.http`:
```http
POST http://localhost:3000/api/admin/index-posts
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{}
```

### Step 5: Debugger Should Pause!
When you trigger the POST request:
- VS Code should pause at line 40 (the `debugger;` statement)
- You can inspect variables in the Debug panel
- You can step through the code with F10 (step over) or F11 (step into)

## 🚨 Important Rules

### DO:
✅ Use VS Code's F5 to start debugging
✅ Let VS Code manage the Next.js process
✅ Use "debug full stack" or "debug server-side" configuration

### DON'T:
❌ Run `npm run dev:debug` manually when using launch mode
❌ Run `npm run dev` manually when using launch mode
❌ Try to attach to a manually started server (that's the old way)

## Troubleshooting

### If breakpoint still shows "Unbound"
1. **Stop everything**: Press `Shift+F5` to stop debugging
2. **Clean build**: Run `rm -rf .next` in terminal
3. **Restart**: Press `F5` again
4. **Wait**: Let Next.js fully compile before triggering the request

### If port 3000 is already in use
```bash
# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9

# Or kill all Next.js processes
pkill -f "next dev"
```

### If you see "Cannot connect to runtime process"
- Make sure you selected the right debug configuration
- Check that no other Next.js instance is running
- Try restarting VS Code

## Expected Behavior

When everything works correctly:
1. Press F5 → Server starts automatically
2. Set breakpoint → Shows as red dot (not gray)
3. Trigger POST request → Debugger pauses at your breakpoint
4. You can inspect variables and step through code

## Next Steps

After verifying debugging works:
1. Remove the `debugger;` statement (line 40)
2. Use regular breakpoints by clicking in the gutter
3. Debug any server-side code the same way!
