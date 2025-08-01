import Pusher from "pusher-js"

// ✅ Make sure NEXT_PUBLIC env vars are set in .env.local
export const pusherClient = new Pusher(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  }
)
