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
				type: FieldType.SingleSelect,
				name: "Category",
				property: {
					options: [
						{
							name: "Folder",
						},
						{
							name: "Table",
						},
					]
				}
			},
		]
	}).then((res)=>{
		return bitable.base.getTable(res.tableId)
	}).then((tbl)=>{
		tbl.addField({
			type: FieldType.SingleLink,
			name: "Parent",
			property: {
				tableId: tbl.id,
				multiple: false,
			}
		})
		return tbl
	})
}