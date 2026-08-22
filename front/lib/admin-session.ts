export const ADMIN_SESSION_COOKIE = "totem_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

export type SessionPayload = {
  sub: string;
  exp: number;
};

function encodeBase64Url(value: string | ArrayBuffer) {
  const bytes =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return encodeBase64Url(signature);
}

export async function createAdminSession(username: string, secret: string) {
  const payload: SessionPayload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${await sign(encodedPayload, secret)}`;
}

export async function verifyAdminSession(token: string, secret: string) {
  return Boolean(await readAdminSession(token, secret));
}

export async function readAdminSession(token: string, secret: string): Promise<SessionPayload | null> {
  const [encodedPayload, receivedSignature, extra] = token.split(".");
  if (!encodedPayload || !receivedSignature || extra) return null;

  const expectedSignature = await sign(encodedPayload, secret);
  if (expectedSignature.length !== receivedSignature.length) return null;

  let difference = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    difference |=
      expectedSignature.charCodeAt(index) ^ receivedSignature.charCodeAt(index);
  }
  if (difference !== 0) return null;

  try {
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized)) as SessionPayload;
    return (
      typeof payload.sub === "string" &&
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(Date.now() / 1000)
    ) ? payload : null;
  } catch {
    return null;
  }
}
