import { PrismaClient } from '@/generated/prisma' // Use the generated client path

declare global {
	// allow global `var` declarations
	// eslint-disable-next-line no-var
	var prisma: PrismaClient | undefined
}

export const prisma =
	global.prisma ||
	new PrismaClient({
		// Optional: log: ['query'], // Uncomment to log Prisma queries
	})

if (process.env.NODE_ENV !== 'production') global.prisma = prisma
