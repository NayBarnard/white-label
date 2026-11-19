import { createHmac, timingSafeEqual } from "node:crypto";

function getSigningKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function createNewsletterUnsubscribeToken(subscriptionId: number) {
  const key = getSigningKey();
  if (!key) throw new Error("Newsletter unsubscribe signing is not configured.");
  const id = String(subscriptionId);
  const signature = createHmac("sha256", key).update(id).digest("hex");
  return `${id}.${signature}`;
}

export function verifyNewsletterUnsubscribeToken(token: unknown) {
  if (typeof token !== "string") return null;
  const match = /^([1-9]\d{0,14})\.([0-9a-f]{64})$/.exec(token);
  if (!match) return null;

  const id = Number(match[1]);
  const key = getSigningKey();
  if (!Number.isSafeInteger(id) || !key) return null;

  const expected = createHmac("sha256", key).update(match[1]).digest();
  const provided = Buffer.from(match[2], "hex");
  if (!timingSafeEqual(expected, provided)) return null;
  return id;
}
