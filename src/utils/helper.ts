/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Group by key
 *
 * @param arr
 * @param key
 * @returns
 */
export function groupBy<T extends Record<string, any>>(
	arr: Array<T>,
	key: string,
) {
	const res: Record<string, T[]> = {}
	const keys = key.split(".")
	arr.forEach((v) => {
		let k: any = v
		for (const key of keys) {
			k = k[key]
		}
		if (!res[k]) {
			res[k] = []
		}
		res[k].push(v)
	})
	return res
}

/**
 * Delay Time
 *
 * @param t
 * @returns
 */
export function delay(t: number) {
	return new Promise(function (resolve) {
		setTimeout(resolve, t)
	})
}

/**
 * Batch processing
 *
 * @param maxNumber
 * @param interval
 * @param list
 * @param action
 * @returns
 */
export async function batch<T>(
	maxNumber: number = 5000,
	interval: number = 0,
	list: Array<T>,
	action: (list: Array<T>) => Promise<void>,
) {
	if (list.length === 0) return
	if (list.length <= maxNumber) {
		await action(list)
	} else {
		const count = Math.ceil(list.length / maxNumber)
		for (let i = 0; i < count; i++) {
			await action(list.slice(i * maxNumber, (i + 1) * maxNumber))
			if (interval > 0) {
				await delay(interval)
			}
		}
	}
}