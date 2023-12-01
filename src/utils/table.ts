/* eslint-disable no-constant-condition */
import type { ITable, IRecord } from "@lark-base-open/js-sdk"

export async function getTableRecords(table: ITable) {
	const tableCells: IRecord[] = []
	let pageToken: string | undefined = undefined
	while (true) {
		const records = await table.getRecords({
			pageSize: 5000,
			pageToken,
		})
		pageToken = records.pageToken
		tableCells.push(...records.records)
		if (!records.hasMore || !pageToken) break
	}
	return tableCells
}

export async function updateRecord() {
	
}