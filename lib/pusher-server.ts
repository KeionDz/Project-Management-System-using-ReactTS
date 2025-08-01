// lib/pusher-server.ts
import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,       // server-only
  key: process.env.PUSHER_KEY!,            // server-only
  secret: process.env.PUSHER_SECRET!,      // server-only
  cluster: process.env.PUSHER_CLUSTER!,    // server-only
  useTLS: true,
});
