import bcrypt from 'bcrypt'

const saltRounds = 10 // Adjust salt rounds based on security needs and performance

/**
 * Hashes a plain text password.
 */
export async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, saltRounds)
}

/**
 * Compares a plain text password with a stored hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
	return await bcrypt.compare(password, hash)
}
