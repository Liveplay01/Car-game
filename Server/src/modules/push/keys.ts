import { newVapidKeys } from './webpush.ts';

// `npm run vapid`: a new key pair for the notifications. Set both in Coolify once; a new pair cuts off every device that subscribed with the old one.
const keys = newVapidKeys();
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}`);
