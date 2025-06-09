import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, refreshSession } from '@/lib/auth'

export async function POST() {
	console.log('[RefreshAPI] Received refresh token request')

	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id || !session.refreshToken) {
			console.log('[RefreshAPI] No session or refresh token found')
			return NextResponse.json({ error: 'No session or refresh token found' }, { status: 401 })
		}

		console.log(`[RefreshAPI] Attempting to refresh session for user ${session.user.id}`)
		const result = await refreshSession(session.refreshToken, session.user.id)

		if (!result) {
			console.log(`[RefreshAPI] Failed to refresh session for user ${session.user.id}`)
			return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
		}

		console.log(`[RefreshAPI] Successfully refreshed session for user ${session.user.id}`)
		return NextResponse.json({
			user: result.user,
			refreshToken: result.refreshToken,
		})
	} catch (error) {
		console.error('[RefreshAPI] Error refreshing session:', error)
		return NextResponse.json({ error: 'Failed to refresh session' }, { status: 500 })
	}
}
