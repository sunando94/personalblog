# Notification System

## Overview
A Redis-backed real-time notification system with automatic 7-day TTL (Time To Live) for efficient storage management on a 30MB Redis cluster.

## Features

- ✅ **Redis-backed storage** with automatic fallback to in-memory storage
- ✅ **7-day automatic expiration** (TTL) for all notifications
- ✅ **Real-time updates** with 30-second auto-refresh
- ✅ **Persistent user sessions** using localStorage
- ✅ **Efficient data structures** using Redis sorted sets for chronological ordering
- ✅ **Memory-optimized** for 30MB Redis clusters
- ✅ **Full CRUD operations** (Create, Read, Update, Delete)

## Architecture

### Data Storage

Notifications are stored in Redis using two key patterns:

1. **Individual notifications**: `notification:{userId}:{notificationId}`
   - Stores the full notification object as JSON
   - Automatically expires after 7 days

2. **User notification index**: `user_notifications:{userId}`
   - Redis sorted set with notification IDs
   - Scores are timestamps for chronological ordering
   - Also expires after 7 days

### Memory Optimization

For a **30MB Redis cluster**, the 7-day TTL ensures:
- Old notifications are automatically cleaned up
- No manual cleanup required
- Predictable memory usage
- Efficient storage for active notifications

**Estimated capacity**: With an average notification size of ~500 bytes, a 30MB cluster can store approximately **60,000 notifications** before TTL cleanup.

## API Endpoints

### GET `/api/notifications`
Fetch notifications for a user.

**Query Parameters:**
- `userId` (required): User ID
- `unreadOnly` (optional): Set to "true" to fetch only unread notifications

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "userId": "user_123",
      "type": "success",
      "title": "Blog Post Published",
      "message": "Your post has been published successfully.",
      "timestamp": "2026-02-06T08:50:00.000Z",
      "read": false,
      "action": {
        "label": "View Post",
        "href": "/posts/my-post"
      }
    }
  ],
  "unreadCount": 5
}
```

### POST `/api/notifications`
Create a new notification.

**Request Body:**
```json
{
  "userId": "user_123",
  "type": "success",
  "title": "Notification Title",
  "message": "Notification message",
  "action": {
    "label": "Action Label",
    "href": "/action-url"
  }
}
```

**Notification Types:**
- `success` - Green checkmark icon
- `info` - Blue info icon
- `warning` - Yellow warning icon
- `error` - Red error icon

### PATCH `/api/notifications`
Mark notification(s) as read.

**Request Body (single notification):**
```json
{
  "userId": "user_123",
  "notificationId": "notification_uuid"
}
```

**Request Body (all notifications):**
```json
{
  "userId": "user_123",
  "markAllRead": true
}
```

### DELETE `/api/notifications`
Delete notification(s).

**Query Parameters:**
- `userId` (required): User ID
- `id` (optional): Specific notification ID to delete

If `id` is not provided, all notifications for the user will be deleted.

## Usage Examples

### Creating a Notification

```typescript
// From server-side code
import { createNotification } from "@/lib/notifications";

await createNotification({
  userId: "user_123",
  type: "success",
  title: "Blog Post Published",
  message: "Your post 'My Awesome Post' has been published successfully.",
  read: false,
  action: {
    label: "View Post",
    href: "/posts/my-awesome-post"
  }
});
```

### Creating a Notification via API

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "type": "info",
    "title": "System Update",
    "message": "A new feature has been added to the platform."
  }'
```

### Fetching Notifications

```typescript
// From client-side code
const response = await fetch(`/api/notifications?userId=${userId}`);
const data = await response.json();
console.log(data.notifications);
```

### Marking as Read

```typescript
await fetch("/api/notifications", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    userId: "user_123", 
    notificationId: "notification_uuid" 
  })
});
```

## Frontend Integration

The notification page (`/notifications`) automatically:
- Generates a unique user ID stored in localStorage
- Fetches notifications every 30 seconds
- Displays loading and error states
- Formats timestamps as relative time (e.g., "2 hours ago")
- Shows unread count badge
- Provides filter options (All/Unread)

## Redis Configuration

The system uses the existing Redis configuration from `mcp-auth.ts`:

```bash
# Environment variables
REDIS_URL=redis://localhost:6379
# or for Railway
storage_REDIS_URL=redis://username:password@host:port
```

### Fallback Behavior

If Redis is unavailable:
- System automatically falls back to in-memory storage
- Warning logged: `⚠️ Notification Redis unavailable, using in-memory storage fallback`
- All features continue to work (data lost on restart)

## TTL Management

### Automatic Cleanup
- All notifications expire after **7 days** (604,800 seconds)
- Redis automatically removes expired keys
- No manual cleanup required

### TTL Preservation
When updating notifications (e.g., marking as read):
- Remaining TTL is preserved
- If TTL cannot be determined, resets to 7 days

## Testing

### Create Test Notifications

```bash
# Success notification
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "type": "success",
    "title": "Test Success",
    "message": "This is a test success notification"
  }'

# Info notification with action
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "type": "info",
    "title": "Test Info",
    "message": "This is a test info notification",
    "action": {
      "label": "Learn More",
      "href": "/"
    }
  }'

# Warning notification
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "type": "warning",
    "title": "Test Warning",
    "message": "This is a test warning notification"
  }'

# Error notification
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "type": "error",
    "title": "Test Error",
    "message": "This is a test error notification"
  }'
```

### Check Redis Keys

```bash
# Connect to Redis CLI
redis-cli

# List all notification keys
KEYS notification:*

# Check TTL of a notification
TTL notification:user_123:some-uuid

# View notification content
GET notification:user_123:some-uuid

# List user's notification IDs (sorted by timestamp)
ZRANGE user_notifications:user_123 0 -1 REV
```

## Performance Considerations

### For 30MB Redis Cluster

1. **Notification Size**: ~500 bytes average
2. **Capacity**: ~60,000 notifications
3. **TTL**: 7 days automatic cleanup
4. **Indexing**: Sorted sets for efficient retrieval

### Optimization Tips

- Keep notification messages concise
- Use action links instead of embedding full content
- Monitor Redis memory usage
- Consider reducing TTL if memory pressure occurs

## Integration Points

The notification system can be triggered from:

1. **Blog post commits** (`/api/commit-post`)
2. **LinkedIn authentication** (`/api/linkedin/callback`)
3. **MCP operations** (via MCP server tools)
4. **Custom workflows** (any server-side code)

Example integration:

```typescript
// In your API route
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  // Your logic here...
  
  // Create notification
  await createNotification({
    userId: session.userId,
    type: "success",
    title: "Action Completed",
    message: "Your action was completed successfully.",
    read: false,
  });
  
  return NextResponse.json({ success: true });
}
```

## Monitoring

Check Redis connection status:
```bash
# View server logs
npm run dev

# Look for:
# ✅ Notification Redis connected successfully
# or
# ⚠️ Notification Redis unavailable, using in-memory storage fallback
```

## Future Enhancements

Potential improvements:
- [ ] WebSocket support for real-time push notifications
- [ ] Email/SMS notification delivery
- [ ] Notification preferences/settings
- [ ] Notification categories and filtering
- [ ] Batch notification operations
- [ ] Analytics and notification metrics
