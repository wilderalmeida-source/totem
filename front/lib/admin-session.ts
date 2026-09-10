export const ADMIN_SESSION_COOKIE = "totem_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

export type SessionPayload = {
  sub: string;
  exp: number;
  mustChangePassword?: boolean;
  permissions: string[];
  source?: 'database' | 'bootstrap';
  version?: string;
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

export async function createAdminSession(username: string, secret: string, mustChangePassword = false, permissions: string[] = ['*'], identity: { source: 'database' | 'bootstrap'; version?: string } = { source: 'database' }) {
  const payload: SessionPayload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
    mustChangePassword,
    permissions,
    ...identity,
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
    const valid = (
      typeof payload.sub === "string" &&
      typeof payload.exp === "number" &&
      Array.isArray(payload.permissions) &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
    if (!valid) return null;
    if (payload.source === 'bootstrap') return payload.sub === process.env.ADMIN_USERNAME ? payload : null;
    if (payload.source !== 'database' || !payload.version) return null;
    const base = process.env.LINK_API_INTERNA;
    const apiToken = process.env.TOKEN_API_INT;
    if (!base || !apiToken) return null;
    const response = await fetch(`${base}/clinux/admin/users/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ username: payload.sub, version: payload.version }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const current = await response.json();
    if (!Array.isArray(current.permissions) || !current.permissions.every((p: unknown) => typeof p === 'string')) return null;
    return { ...payload, permissions: current.permissions, mustChangePassword: current.mustChangePassword === true };
  } catch {
    return null;
  }
}
