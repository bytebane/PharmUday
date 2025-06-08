import * as argon2 from 'argon2'

/**
 * Hashes a plain text password using Argon2id.
 * Uses secure defaults:
 * - type: argon2id (resistant to GPU cracking)
 * - memoryCost: 64MB (adjustable based on server capacity)
 * - timeCost: 3 iterations
 * - parallelism: 1 thread
 */
export async function hashPassword(password: string): Promise<string> {
	return await argon2.hash(password, {
		type: argon2.argon2id,
		memoryCost: 2 ** 16, // 64MB
		timeCost: 3,
		parallelism: 1,
	})
}

/**
 * Compares a plain text password with a stored hash using Argon2.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
	return await argon2.verify(hash, password)
}
