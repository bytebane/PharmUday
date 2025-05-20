export const getTodayRange = () => {
	const start = new Date()
	start.setHours(0, 0, 0, 0)
	const end = new Date(start)
	end.setDate(start.getDate() + 1) // end is exclusive (up to, but not including, the start of the next day)
	return { start, end }
}

export const getThisMonthRange = () => {
	const now = new Date()
	const start = new Date(now.getFullYear(), now.getMonth(), 1)
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 1) // end is exclusive
	return { start, end }
}

export const getThisYearRange = () => {
	const now = new Date()
	const start = new Date(now.getFullYear(), 0, 1)
	const end = new Date(now.getFullYear() + 1, 0, 1) // end is exclusive
	return { start, end }
}
