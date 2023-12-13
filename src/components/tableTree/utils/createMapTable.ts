import { bitable, FieldType } from "@lark-base-open/js-sdk"

export function createMapTable(name: string) {
	if (!name) return Promise.reject(new Error("name is required"))
	return bitable.base.addTable({
		name,
		fields: [
			{
				type: FieldType.Text,
				name: "id",
			},
			{
				type: FieldType.Text,
				name: "Name",
			},
			{
				type: FieldType.Text,
				name: "Category",
			},
			{
				type: FieldType.Text,
				name: "tableId",
			}
		]
	}).then((res) => {
		return bitable.base.getTable(res.tableId)
	}).then((tbl) => {
		return tbl.addField({
			type: FieldType.SingleLink,
			name: "Parent",
			property: {
				tableId: tbl.id,
				multiple: false,
			}
		}).then(() => tbl)
	})
}