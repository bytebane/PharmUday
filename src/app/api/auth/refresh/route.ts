import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, refreshSession } from '@/lib/auth'

export async function POST() {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user?.id || !session.refreshToken || !session.deviceId) {
			return NextResponse.json({ error: 'No session, refresh token, or device ID found' }, { status: 401 })
		}

		const result = await refreshSession(session.refreshToken, session.user.id, session.deviceId)

		if (!result) {
			return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
		}

		return NextResponse.json({
			user: result.user,
			refreshToken: result.refreshToken,
			deviceId: result.deviceId,
		})
	} catch (error) {
		console.error('[RefreshAPI] Error refreshing session:', error)
		return NextResponse.json({ error: 'Failed to refresh session' }, { status: 500 })
	}
}
