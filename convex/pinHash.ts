import bcrypt from "bcryptjs";

const COST = 10;

export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = await bcrypt.genSalt(COST);
  const hash = await bcrypt.hash(pin, salt);
  return { hash, salt };
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(pin, hash);
}
