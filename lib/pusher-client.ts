// lib/pusher-client.ts
import Pusher from "pusher-js";

export const pusherClient = new Pusher(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,     // public key
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!, // public cluster
  }
);
