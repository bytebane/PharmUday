import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth' // Import your configured auth options

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } // Export handlers for GET and POST requests
