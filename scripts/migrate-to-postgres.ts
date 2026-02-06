import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "redis";
import { initDb } from "../src/lib/db";
import { UserStore } from "../src/lib/stores/user-store";
import { NotificationStore } from "../src/lib/stores/notification-store";
import { AuditStore } from "../src/lib/stores/audit-store";

const REDIS_URL = process.env.storage_REDIS_URL || process.env.REDIS_URL;

async function migrate() {
  await initDb();
  console.log("🔄 Starting full data migration to PostgreSQL...");

  const redis = createClient({ url: REDIS_URL || "" });
  if (!REDIS_URL) {
    console.error("❌ No REDIS_URL provided.");
    process.exit(1);
  }

  try {
    await redis.connect();

    // 1. Migrate Users
    console.log("👥 Migrating users...");
    const allProfiles = await redis.hGetAll("mcp_social_profiles");
    const users = Object.values(allProfiles).map((p: any) => JSON.parse(p));
    
    for (const user of users) {
      await UserStore.upsert(user);
      console.log(`  ✅ User: ${user.name}`);
    }

    // 2. Migrate Notifications
    console.log("🔔 Migrating notifications...");
    const notifKeys = await redis.keys("user_notifications:*");
    let totalNotifs = 0;

    for (const key of notifKeys) {
      const userId = key.split(":")[1];
      if (!userId || userId === "unread") continue;

      // Handle both List and String storage (depending on history)
      const type = await redis.type(key);
      let notifs: any[] = [];

      if (type === "list") {
        const rawList = await redis.lRange(key, 0, -1);
        notifs = rawList.map(n => JSON.parse(n));
      } else if (type === "string") {
        const rawStr = await redis.get(key);
        if (rawStr) notifs = JSON.parse(rawStr);
      }

      for (const n of notifs) {
        try {
          // Map old schema to new if necessary
          await NotificationStore.create({
            userId,
            type: n.type || "info",
            title: n.title || "Legacy Notification",
            message: n.message || "",
            read: n.read || false,
            action: n.action,
            primaryAction: n.primaryAction
          });
          totalNotifs++;
        } catch (e) {
          console.warn(`  ⚠️ Failed to migrate notification for ${userId}`);
        }
      }
    }
    console.log(`✅ Migrated ${totalNotifs} notifications.`);

    // 3. Log migration
    await AuditStore.log("FULL_DATA_MIGRATION", null, { 
      users: users.length, 
      notifications: totalNotifs 
    });

  } catch (err: any) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await redis.disconnect();
    console.log("🏁 Migration script finished.");
    process.exit(0);
  }
}

migrate().catch(console.error);
