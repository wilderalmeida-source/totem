import crypto from "crypto";

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url"); // forte e amigável
}

export function hashToken(token:string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}