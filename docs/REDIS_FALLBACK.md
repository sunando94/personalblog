# Redis Fallback Implementation

## Overview
The authentication system now includes **graceful Redis fallback** to ensure the application works seamlessly even when Redis is unavailable.

## How It Works

### Automatic Detection
- On startup, the system attempts to connect to Redis using `REDIS_URL`
- If Redis is unavailable (connection refused, timeout, etc.), the system automatically switches to **in-memory storage**
- A warning is logged: `⚠️ Redis unavailable, using in-memory storage fallback`

### In-Memory Storage
When Redis is unavailable, the following data is stored in-memory:
- **User Profiles**: Social login profiles (LinkedIn)
- **Refresh Tokens**: OAuth2 refresh tokens with expiry
- **Audit Logs**: User actions and system events
- **Session Data**: Active token metadata

### Limitations of In-Memory Mode
⚠️ **Important**: In-memory storage has these limitations:
1. **Data Loss on Restart**: All data is lost when the server restarts
2. **No Persistence**: Data is not shared across multiple server instances
3. **Memory Constraints**: Limited by available RAM

### Production Recommendations
For production deployments:
1. **Use Redis Cloud**: Set up a managed Redis instance (Redis Labs, AWS ElastiCache, etc.)
2. **Set REDIS_URL**: Configure the environment variable with your Redis connection string
3. **Monitor Logs**: Watch for the Redis connection success message: `✅ Redis connected successfully`

## Environment Variables

```bash
# For local development
REDIS_URL=redis://username:password@host:port

# For Railway production (automatically set by Railway)
storage_REDIS_URL=redis://username:password@host:port

# The app checks storage_REDIS_URL first, then falls back to REDIS_URL

# Optional - JWT secret (defaults to fallback)
JWT_SECRET=your_32_character_secret_key_here

# Optional - Master token for admin access
MCP_MASTER_TOKEN=your_master_token
```

### Railway Deployment Note
Railway automatically sets `storage_REDIS_URL` when you add a Redis plugin. The app will automatically detect and use this variable in production.

## Testing Locally

### Without Redis (In-Memory Mode)
```bash
# Simply don't set REDIS_URL
npm run dev
```

### With Redis (Persistent Mode)
```bash
# Install Redis locally
brew install redis  # macOS
# or
sudo apt-get install redis-server  # Linux

# Start Redis
redis-server

# Set environment variable
export REDIS_URL=redis://localhost:6379

# Run the app
npm run dev
```

## Deployment Platforms

### Vercel
Add environment variable in project settings:
```
REDIS_URL=redis://your-redis-cloud-url
```

### Railway
**No manual configuration needed!**
1. Add a Redis plugin to your Railway project
2. Railway automatically sets `storage_REDIS_URL`
3. The app will detect and use it automatically

### Render
1. Add a Redis service
2. Set `REDIS_URL` environment variable manually

### Docker
```dockerfile
# docker-compose.yml
services:
  app:
    environment:
      - REDIS_URL=redis://redis:6379
  redis:
    image: redis:alpine
```

## Monitoring

Check the server logs on startup:
- ✅ `Redis connected successfully` - Persistent mode active
- ⚠️ `Redis unavailable, using in-memory storage fallback` - In-memory mode active

## Migration Path

If you start with in-memory mode and later add Redis:
1. Set the `REDIS_URL` environment variable
2. Restart the application
3. Users will need to log in again (previous sessions are not migrated)
4. All new data will be persisted to Redis

## Code Reference

See `/src/lib/mcp-auth.ts` for the implementation details of the fallback system.
