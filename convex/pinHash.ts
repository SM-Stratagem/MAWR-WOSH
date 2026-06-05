import bcrypt from "bcryptjs";

const COST = 10;

/**
 * Hash a PIN using bcrypt. Uses the SYNC bcryptjs API on purpose: the async
 * variant calls setTimeout internally, which Convex queries/mutations forbid.
 * Sync hashing is fine here — PINs are short and bcrypt at cost 10 finishes
 * in single-digit milliseconds.
 */
export function hashPin(pin: string): { hash: string; salt: string } {
  const salt = bcrypt.genSaltSync(COST);
  const hash = bcrypt.hashSync(pin, salt);
  return { hash, salt };
}

/**
 * Verify a PIN against a bcrypt hash. Sync for the same reason as hashPin.
 */
export function verifyPin(pin: string, hash: string): boolean {
  return bcrypt.compareSync(pin, hash);
}
