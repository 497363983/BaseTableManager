import type {
	ITableMeta,
	ITable,
	IFieldMeta,
	IRecord,
	IRecordValue,
	IOpenLink,
	IFieldConfig,
} from "@lark-base-open/js-sdk"
import {
	bitable,
	checkers,
	PermissionEntity,
	OperationType,
	TableOperation
} from "@lark-base-open/js-sdk"
import {
	ElMessageBox,
	ElMessage,
	ElSelectV2,
	ElLoading,
} from "element-plus"
import {
	computed,
	h,
	ref,
	shallowRef,
	watch,
	toRaw
} from "vue"
import { i18n } from "@/i18n"
import type {
	NodeItem,
	NodeRaw,
	FolderNode,
	ViewFolderNode,
	SubTableFolderNode,
	ViewNode,
} from "@/types"
import { NodeCategory, NodeIcon, TableNode } from "@/types"
import { getTableRecords } from "@/utils"
import {
	onTableAdd,
	onTableDelete,
	onRecordModify,
	onRecordAdd,
	useSelection
} from "@qww0302/use-bitable"
import { groupBy } from "@/utils"
import { viewList, uid, createMapTable } from "../utils"
import { useStorage } from "@vueuse/core"

export interface StorageItem {
	name: string
	id: string
	type: "shared" | "local"
}

export interface LocalMapStorage extends StorageItem {
	type: "local"
	tableMap: NodeRaw[]
}

export interface SharedMapStorage extends StorageItem {
	type: "shared"
	tableMapTableId: string
}

export type MapStorageItem = LocalMapStorage | SharedMapStorage

interface MapStorage {
	storage: Record<string, Record<string, MapStorageItem>>
	lastOpened: string | null
}

const getTablePermission = (tableId: string, type: TableOperation) => {
	return bitable.base.getPermission({
		entity: PermissionEntity.Table,
		param: {
			tableId,
		},
		type,
	}).then((permission) => {
		return permission
	})
}

export function useTableMap() {
	const { baseId, tableId: activeTableId } = useSelection()
	const store = useStorage<MapStorage>("BaseTableManager", {
		storage: {},
		lastOpened: null,
	}, localStorage)
	const curBaseStore = computed(() => {
		if (!baseId.value) return null
		return store.value.storage[baseId.value]
	})
	const mapList = ref<MapStorageItem[]>([])
	const currentMap = ref<MapStorageItem | null>(null)
	const refreshing = ref(false)
	const editable = ref(false)
	const manageable = ref(false)
	const canAddTable = ref(false)
	const sharedTableUpdating = ref(false)
	const isSharedTable = ref(false)
	const updateTasks = ref<Array<{
		add: IRecordValue[]
		update: IRecord[]
		delete: string[]
		callback?: () => void
			}>>([])
	const treeData = ref<NodeItem[]>([])
	const tableMap = ref<NodeRaw[]>([])
	const nodes = ref<NodeItem[]>([])
	const sharedTableMapTableId = ref<string | null>(null)
	const sharedTableMapTable = shallowRef<ITable | null>(null)
	const sharedTableMapTableFieldMetaList = ref<IFieldMeta[]>([])
	const loadingSharedTableMapTable = ref(false)
	const removingNode = ref(false)
	const creatingNode = ref(false)
	const tableMetaList = ref<ITableMeta[]>([])
	const tableList = ref<Record<string, ITable>>({})

	bitable.base.getPermission({
		entity: PermissionEntity.Table,
		type: OperationType.Addable,
		param: {}
	}).then((permission) => {
		canAddTable.value = permission
		console.log("canAdd",permission)
	})
	bitable.base.getPermission({
		entity: PermissionEntity.Base,
		type: OperationType.Manageable,
	}).then((permission) => {
		manageable.value = permission
	})

	const addUpdateTask = (options: {
		add: IRecordValue[]
		update: IRecord[]
		delete: string[]
		callback?: () => void
	}) => {
		updateTasks.value.push(options)
	}

	const tableNames = computed(() => {
		return tableMetaList.value.map((tableMeta) => tableMeta.name)
	})
	const activeTableNodeId = computed(() => {
		if (!activeTableId.value) return null
		const node = nodes.value.find((node) => {
			if (node.category !== NodeCategory.TABLE) return false
			return (node as TableNode).meta.id === activeTableId.value
		})
		if (!node) return null
		return node.id
	})

	const loadTableList = () =>{
		return Promise.all([
			bitable.base.getTableMetaList().then((res) => {
				tableMetaList.value = res
			}),
			bitable.base.getTableList().then((res) => {
				tableList.value = res.reduce((prev, curr) => {
					prev[curr.id] = curr
					return prev
				}, {} as Record<string, ITable>)
			}),
		])
	}
	const sharedTableMapOptions = computed(() => {
		return tableMetaList.value.map((tableMeta) => {
			return {
				label: tableMeta.name,
				value: tableMeta.id,
			}
		})
	})
	const nodeRawPropIds = computed(()=>{
		const rawKeys = ["id", "name", "category", "parent", "tableid"]
		return sharedTableMapTableFieldMetaList.value.reduce((prev, curr) => {
			if (rawKeys.includes(curr.name.toLocaleLowerCase())) prev[curr.name.toLowerCase() as keyof NodeRaw] = curr.id
			return prev
		}, {} as Record<keyof NodeRaw, string>)
	})
	const tableFieldsName = computed(()=>{
		return Object.keys(nodeRawPropIds.value)
	})
	const updateSharedTable = () => {
		if (!isSharedTable.value) return
		if (!sharedTableMapTable.value) return Promise.reject(new Error("TableMap Table not found"))
		if (!editable.value) return Promise.reject(new Error("No permission"))
		if (sharedTableUpdating.value) return Promise.reject(new Error("Updating"))
		if (updateTasks.value.length === 0) return Promise.reject(new Error("No update task"))
		sharedTableUpdating.value = true
		const task = updateTasks.value.shift()
		if (!task) return Promise.reject(new Error("No update task"))
		const { add, update, delete: del, callback } = task
		return Promise.allSettled([
			update.length > 0 ? sharedTableMapTable.value?.setRecords(toRaw(update)) : null,
			del.length > 0 ? sharedTableMapTable.value?.deleteRecords(toRaw(del)) : null,
			add.length > 0 ? sharedTableMapTable.value?.addRecords(toRaw(add)) : null,
		]).then((res)=>{
			console.log("updateRes", res)
			callback?.()
			sharedTableUpdating.value = false
			updateSharedTable()
		}).catch((e) => {
			console.error(e)
			sharedTableUpdating.value = false
			updateSharedTable()
		})
	}
	const loadSharedTableRaws = (tableId: string) => {
		return new Promise<NodeRaw[]>((resolve, reject) => {
			bitable.base.getTable(tableId).then((table) => {
				sharedTableMapTable.value = table
				return table.getFieldMetaList()
			}).then((fieldMetaList) => {
				sharedTableMapTableFieldMetaList.value = fieldMetaList
				return getTableRecords(sharedTableMapTable.value as ITable)
			}).then((records) => {
				if (["id", "name", "category", "parent", "tableid"].some((key) => !tableFieldsName.value.includes(key)))  {
					ElMessage.error({
						message: "TableMap Table must have id, Name, Category, Parent, tableId fields",
						grouping: true,
					})
					reject(new Error("TableMap Table must have id, Name, Category, Parent, tableId fields"))
					return
				}
				const notExistTableRecords: string[] = []
				const needUpdate: IRecord[] = []
				const raws = records.map((record) => {
					const fields = record.fields
					const id = record.recordId
					const idCellValue = fields[nodeRawPropIds.value.id]
					const cellId = checkers.isSegments(idCellValue) ? idCellValue[0].text : null
					const nameCellValue = fields[nodeRawPropIds.value.name]
					const name = checkers.isSegments(nameCellValue) ? nameCellValue[0].text : null
					const categoryCellValue = fields[nodeRawPropIds.value.category]
					const category = checkers.isSegments(categoryCellValue) ? categoryCellValue[0].text : null
					const parentCellValue = fields[nodeRawPropIds.value.parent]
					const parent = checkers.isLink(parentCellValue) ? parentCellValue.recordIds[0] : null
					const tableIdCellValue = fields[nodeRawPropIds.value.tableid]
					let tableId = checkers.isSegments(tableIdCellValue) ? tableIdCellValue[0].text : null
					if (!category) {
						notExistTableRecords.push(id)
						return null
					}
					if (cellId !== id) {
						needUpdate.push({
							recordId: id,
							fields: {
								[nodeRawPropIds.value.id]: id,
							},
						})
					}
					if (category === NodeCategory.TABLE) {
						if (!tableId && (name && tableNames.value.includes(name))) {
							const tableMeta = tableMetaList.value.find((tableMeta) => tableMeta.name === name)
							if (!tableMeta) {
								notExistTableRecords.push(id)
								return null
							}
							needUpdate.push({
								recordId: id,
								fields: {
									[nodeRawPropIds.value.tableid]: tableMeta.id,
								},
							})
							tableId = tableMeta.id
						} else {
							const tableMeta = tableMetaList.value.find((tableMeta) => tableMeta.id === tableId)
							if (!tableMeta) {
								notExistTableRecords.push(id)
								return null
							}
							if (name !== tableMeta.name) {
								needUpdate.push({
									recordId: id,
									fields: {
										[nodeRawPropIds.value.name]: tableMeta.name,
									},
								})
							}
						}
					} else {
						if (!name) {
							notExistTableRecords.push(id)
							return null
						}
					}
					return {
						id,
						name,
						category,
						parent,
						tableid: tableId,
					} as NodeRaw
				}).filter((nodeRaw) => nodeRaw !== null) as NodeRaw[]
				const tablesExist = raws.filter((raw) => raw.category === NodeCategory.TABLE).map((raw) => raw.tableid)
				const extraTables = tableMetaList.value.filter((tableMeta) => !tablesExist.includes(tableMeta.id))
				const extraRaws = extraTables.map((tableMeta) => {
					return {
						id: `${tableMeta.id}-extra`,
						name: tableMeta.name,
						category: NodeCategory.TABLE,
						parent: null,
						tableid: tableMeta.id
					} as NodeRaw
				})
				const needToAdd: IRecordValue[] = extraRaws.map((raw) => {
					return {
						fields: {
							[nodeRawPropIds.value.name]: raw.name,
							[nodeRawPropIds.value.category]: raw.category,
							[nodeRawPropIds.value.parent]: {
								recordIds: [raw.parent].filter(Boolean),
								type: "text",
								tableId: sharedTableMapTableId.value
							},
							[nodeRawPropIds.value.tableid]: raw.tableid,
						}
					} as IRecordValue
				})
				if (extraRaws.length > 0) raws.push(...extraRaws)
				if (
					isSharedTable.value
						&& (
							needUpdate.length > 0
						|| needToAdd.length > 0
						|| notExistTableRecords.length > 0
						)
				) {
					return addUpdateTask({
						add: needToAdd,
						update: needUpdate,
						delete: notExistTableRecords,
						callback: () => {
							loadSharedTableRaws(sharedTableMapTableId.value as string).then((raws) => {
								resolve(raws)
							})
						}
					})
				}
				resolve(raws)
			}).catch((e) => {
				console.error(e)
				reject(e)
			})
		})
	}
	const loadSharedTable: () => Promise<NodeRaw[]> = () => {
		return loadSharedTableRaws(sharedTableMapTableId.value as string)
	}
	const loadLocalMap: () => Promise<NodeRaw[]> = () => {
		return new Promise((resolve, reject) => {
			if (isSharedTable.value) return reject(new Error("Is Shared Table"))
			const notExistRaw: NodeRaw[] = []
			const raws = (currentMap.value as LocalMapStorage).tableMap.map((raw) => {
				if (raw.category === NodeCategory.TABLE) {
					const tableMeta = tableMetaList.value.find((tableMeta) => tableMeta.id === raw.tableid)
					if (!tableMeta) {
						notExistRaw.push(raw)
						return
					}
					raw.name = tableMeta.name
				}
				return raw
			}).filter((raw) => raw !== undefined) as NodeRaw[]
			const tablesExist = raws.filter((raw) => raw.category === NodeCategory.TABLE).map((raw) => raw.tableid)
			const extraTables = tableMetaList.value.filter((tableMeta) => !tablesExist.includes(tableMeta.id))
			const extraRaws = extraTables.map((tableMeta) => {
				return {
					id: uid(),
					name: tableMeta.name,
					category: NodeCategory.TABLE,
					parent: null,
					tableid: tableMeta.id
				} as NodeRaw
			})
			if (extraRaws.length > 0) raws.push(...extraRaws)
			resolve(raws)
		})
	}
	const selectSharedTableMapTable = () => {
		const tempVal = ref<string>()
		const disabled = ref(false)
		ElMessageBox({
			title: i18n.global.t("messageBox.selectSharedTableMapTable"),
			confirmButtonText: i18n.global.t("messageBox.confirm"),
			cancelButtonText: i18n.global.t("messageBox.cancel"),
			showCancelButton: true,
			autofocus: true,
			lockScroll: true,
			message: () => {
				return h(
					ElSelectV2,
					{
						options: sharedTableMapOptions.value,
						modelValue: tempVal.value,
						"onUpdate:modelValue": (val: string) => {
							tempVal.value = val
						},
						placeholder: i18n.global.t("placeholder.selectSharedTableMapTable"),
						filterable: true,
						style: {
							width: "100%",
						},
						// @ts-expect-error use Ref instead of string
						disabled,
					},
				)
			},
			beforeClose: (action, instance, done) => {
				if (loadingSharedTableMapTable.value) return
				if (action !== "confirm") {
					done()
					return
				}
				instance.confirmButtonLoading = true
				if (!tempVal.value) {
					instance.confirmButtonLoading = false
					ElMessage({
						type: "warning",
						message: i18n.global.t("messageBox.selectSharedTableMapTable"),
						grouping: true,
					})
					return
				}
				sharedTableMapTableId.value = tempVal.value
				loadingSharedTableMapTable.value = true
				disabled.value = true
				console.log(instance)
				isSharedTable.value = true
				loadSharedTable().then((raws)=>{
					const map = mapList.value.find((map) => map.type === "shared" && map.tableMapTableId && map.tableMapTableId === sharedTableMapTableId.value)
					console.log("loadTable", map)
					if (map) {
						setCurrentMap(map.id)
					} else {
						const _name = tableMetaList.value.find((meta) => meta.id === sharedTableMapTableId.value)?.name as string
						const newMap = {
							name: _name,
							id: _name,
							type: "shared",
							tableMapTableId: sharedTableMapTableId.value,
						} as SharedMapStorage
						mapList.value.push(newMap)
						setCurrentMap(newMap.id)
					}
					console.log(raws)
					tableMap.value = raws
					ElMessage.success({
						message: i18n.global.t("messageBox.readTableMapSuccess"),
						grouping: true,
					})
				}).catch((e)=>{
					console.error(e)
					ElMessage.error({
						message: e.message,
						grouping: true,
					})
				}).finally(() => {
					loadingSharedTableMapTable.value = false
					instance.confirmButtonLoading = false
					done()
				})
			},
		})
	}
	const getNodeItem = (raw: NodeRaw) => {
		if (raw.category === NodeCategory.FOLDER) {
			return {
				id: raw.id,
				meta: {
					name: raw.name,
				},
				category: NodeCategory.FOLDER,
				children: [],
				icon: {
					name: NodeIcon.FOLDER,
					color: "",
				},
				parent: raw.parent,
				name: raw.name,
				childrenType: [NodeCategory.FOLDER, NodeCategory.TABLE],
			} as FolderNode
		}
		if (raw.category === NodeCategory.TABLE && tableNames.value.includes(raw.name)) {
			const tableMeta = JSON.parse(JSON.stringify(tableMetaList.value.find((tableMeta) => tableMeta.name === raw.name) as ITableMeta))
			return {
				id: raw.id,
				meta: tableMeta,
				category: NodeCategory.TABLE,
				children: [
					{
						id: `${raw.id}-view`,
						meta: {
							name: "views"
						},
						category: NodeCategory.FOLDER,
						children: [],
						icon: {
							name: NodeIcon.FOLDER,
							color: "#5a86f7",
						},
						parent: raw.id,
						name: i18n.global.t("treeNode.views"),
						tableId: tableMeta.id,
						childrenType: [NodeCategory.VIEW],
						lazy: true,
					} as ViewFolderNode,
					{
						id: `${raw.id}-sub-table`,
						meta: {
							name: "subTables",
						},
						category: NodeCategory.FOLDER,
						children: [],
						icon: {
							name: NodeIcon.FOLDER,
							color: "#8558e4",
						},
						parent: raw.id,
						name: i18n.global.t("treeNode.subTables"),
						tableId: tableMeta.id,
						childrenType: [NodeCategory.TABLE, NodeCategory.FOLDER],
					} as SubTableFolderNode,
				],
				icon: {
					name: NodeIcon.TABLE,
					color: "#8558e4",
				},
				parent: raw.parent,
				name: raw.name,
				childrenType: [NodeCategory.FOLDER],
			} as NodeItem
		}
	}
	const updateTreeData = () => {
		console.log("tableMap", tableMap.value)
		const newNodes: Array<NodeItem> = tableMap.value.map((raw) => {
			return getNodeItem(raw)
		}).filter((node) => node !== undefined) as Array<NodeItem>
		console.log("newNodes", newNodes)
		const nodesMap = groupBy(newNodes, "id")
		newNodes.forEach((node) => {
			if (!node.parent) return
			console.log("node", node, nodesMap, nodesMap[node.parent])
			const parent = nodesMap[node.parent]?.[0]
			if (!parent) return
			if (parent.category === NodeCategory.FOLDER) {
				(parent as FolderNode).children.push(node)
				return
			}
			if (parent.category === NodeCategory.TABLE) {
				(parent as TableNode).children[1].children.push(node as TableNode | FolderNode)
				return
			}
		})
		nodes.value = newNodes
		nodes.value.forEach((node) => {
			if (node.category !== NodeCategory.FOLDER) return
			const folder = node as FolderNode
			folder.children.sort((a, b) => {
				if (a.category === b.category) return a.name > b.name ? 1 : -1
				if (a.category === NodeCategory.FOLDER && b.category !== NodeCategory.FOLDER) return -1
				if (a.category !== NodeCategory.FOLDER && b.category === NodeCategory.FOLDER) return 1
				return 0
			})
		})
		nodes.value.sort((a, b) => {
			if (a.category === b.category) return a.name > b.name ? 1 : -1
			if (a.category === NodeCategory.FOLDER && b.category !== NodeCategory.FOLDER) return -1
			if (a.category !== NodeCategory.FOLDER && b.category === NodeCategory.FOLDER) return 1
			return 0
		})
		const tree = newNodes.filter((node) => !node.parent)
		console.log("tree",tree)
		refreshing.value = true
		treeData.value = tree
	}
	const getNodeByKey = (key: string) => {
		return nodes.value.find((node) => node.id === key) as NodeItem
	}
	const removeNodeTo = (node: string | NodeItem, to: string | NodeItem | null, callback?: () => void) => {
		if (typeof node === "string") {
			node = getNodeByKey(node) as NodeItem
		}
		if (typeof to === "string") {
			to = getNodeByKey(to) as NodeItem
		}
		if (!node) return
		if (to && to.category === NodeCategory.FOLDER && to.tableId) to = getNodeByKey(to.parent as string)
		ElMessageBox({
			title: i18n.global.t("messageBox.conform"),
			message: i18n.global.t("messageBox.removeNodeTo", {
				from: node.name,
				to: to ? to.name : i18n.global.t("messageBox.root"),
			}),
			confirmButtonText: i18n.global.t("messageBox.confirm"),
			cancelButtonText: i18n.global.t("messageBox.cancel"),
			showCancelButton: true,
			autofocus: true,
			lockScroll: true,
			beforeClose: (action, instance, done) => {
				if (removingNode.value) return
				if (action !== "confirm") {
					done()
					loadLocalMap().then((raws) => {
						tableMap.value = raws
					})
					return
				}
				instance.confirmButtonLoading = true
				removingNode.value = true
				if (isSharedTable.value) {
					if (!sharedTableMapTable.value || !editable.value) return
					addUpdateTask({
						add: [],
						update: [{
							recordId: (node as NodeItem).id,
							fields: {
								[nodeRawPropIds.value.parent as string]: {
									recordIds: typeof to === "object" && to !== null ? [to.id] : [],
									type: "text",
									tableId: sharedTableMapTableId.value as string
								} as IOpenLink,
							},
						}],
						delete: [],
						callback: () => {
							instance.confirmButtonLoading = false
							removingNode.value = false
							loadSharedTable().then((raws) => {
								tableMap.value = raws
							})
							callback?.()
							done()
						}
					})
				} else {
					if (currentMap.value === null) return
					// (node as NodeItem).parent = typeof to === "object" && to !== null ? to.id : null
					const raw = currentMap.value.tableMap.find((raw) => raw.id === (node as NodeItem).id)
					if (!raw) return
					raw.parent = typeof to === "object" && to !== null ? to.id : null
					console.log("remove", mapList, currentMap.value, nodes, tableMap)
					removingNode.value = false
					callback?.()
					done()
				}
			}
		})

	}
	const createNode = (options: {
		type: Exclude<NodeCategory, NodeCategory.VIEW>
		parent?: string | NodeItem | null
		name: string
		tableConfig?: {
			fields: IFieldConfig[]
		}
	}) => {
		return new Promise<string>((resolve, reject) => {
			const { type, name, tableConfig } = options
			let { parent } = options
			console.log(options)
			if (!name) {
				ElMessage({
					type: "warning",
					message: i18n.global.t(`placeholder.input${type}Name`),
					grouping: true,
				})
				reject(new Error("Please input name"))
				return
			}
			if (
				type === NodeCategory.TABLE
				&& tableNames.value.includes(name)
			) {
				ElMessage({
					type: "warning",
					message: i18n.global.t("messageBox.tableNameExist"),
					grouping: true,
				})
				reject(new Error("tableNameExist"))
				return
			}
			if (typeof parent === "string") {
				parent = getNodeByKey(parent) as NodeItem
			}
			if (parent && parent.tableId) {
				parent = getNodeByKey(parent.parent as string) as NodeItem
			}
			if (isSharedTable.value) {
				if (!sharedTableMapTable.value || !editable.value) reject(new Error("error"))
				if (type === NodeCategory.TABLE) {
					return bitable.base.addTable({
						name,
						fields: tableConfig?.fields || [],
					}).then(({ tableId }) => {
						addUpdateTask({
							add: [
								{
									fields: {
										[nodeRawPropIds.value.name]: name,
										[nodeRawPropIds.value.category]: type,
										[nodeRawPropIds.value.parent]: {
											recordIds: typeof (parent as NodeItem)?.id === "string" ? [(parent as NodeItem).id] : [],
											type: "text",
											tableId: toRaw(sharedTableMapTableId.value) as string
										},
									},
								} as IRecordValue
							],
							update: [],
							delete: [],
							callback: () => {
								creatingNode.value = false
								loadTableList().then(()=>{
									return loadSharedTable()
								}).then((raws) => {
									tableMap.value = raws
									resolve(tableId)
								}).catch((e) => {
									reject(e)
								})
							}
						})
					})
				}
				addUpdateTask({
					add: [
						{
							fields: {
								[nodeRawPropIds.value.name]: name,
								[nodeRawPropIds.value.category]: type,
								[nodeRawPropIds.value.parent]: {
									recordIds: typeof parent?.id === "string" ? [parent.id] : [],
									type: "text",
									tableId: toRaw(sharedTableMapTableId.value) as string
								},
							},
						} as IRecordValue
					],
					update: [],
					delete: [],
					callback: () => {
						creatingNode.value = false
						loadSharedTable().then((raws) => {
							tableMap.value = raws
							resolve("")
						}).catch((e) => {
							reject(e)
						})
					}
				})
			} else {
				if (!currentMap.value) return
				const raw = {
					id: uid(),
					name,
					category: type,
					parent: typeof parent === "object" && parent !== null ? parent.id : null,
					tableid: null,
				} as NodeRaw
				if (type === NodeCategory.TABLE) {
					return bitable.base.addTable({
						name,
						fields: tableConfig?.fields || [],
					}).then(({ tableId }) => {
						raw.tableid = tableId
						currentMap.value.tableMap.push(raw)
						creatingNode.value = false
						resolve(tableId)
					})
				}
				currentMap.value.tableMap.push(raw)
				creatingNode.value = false
				console.log(store.value)
				resolve("")
			}
		})
	}
	const loadViewList = (node: ViewFolderNode) => {
		return bitable.base.getTable(node.tableId).then((table) => {
			return table.getViewMetaList()
		}).then((viewMetaList) => {
			return viewMetaList.map((viewMeta) => {
				return {
					id: viewMeta.id,
					name: viewMeta.name,
					tableId: node.tableId,
					category: NodeCategory.VIEW,
					parent: node.id,
					children: null,
					// @ts-expect-error viewList
					icon: viewList[viewMeta.type].icon,
					childrenType: [],
					meta: viewMeta,
				} as ViewNode
			})
		})
	}
	const createMapLocally = (name: string, templateId?: string) => {
		const template = mapList.value.find((i) => i.id === templateId)
		if (!template) {
			return loadTableList().then(() => {
				return tableMetaList.value.map((i) => {
					return {
						id: i.id,
						name: i.name,
						category: NodeCategory.TABLE,
						parent: null,
						tableid: i.id,
					} as NodeRaw
				})
			}).then((raws) => {
				const newMap = {
					name,
					id: name,
					type: "local",
					tableMap: raws,
				} as LocalMapStorage
				mapList.value.push(newMap)
				tableMap.value = raws
				setCurrentMap(newMap.id)
			})
		}
		// TODO: create local map from template
		if (template.type === "shared") {
			return loadTableList()
				.then(() => loadSharedTableRaws(template.tableMapTableId))
				.then((raws) => {
					const newMap = {
						name,
						id: name,
						type: "local",
						tableMap: raws,
					} as LocalMapStorage
					mapList.value.push(newMap)
					tableMap.value = raws
					setCurrentMap(newMap.id)
				})
		}
	}
	const createSharedMap = (name: string, templateId?: string) => {
		const template = mapList.value.find((i) => i.id === templateId)
		if (!template) {
			return createMapTable(name)
				.then((table) => {
					const newMap = {
						name,
						id: name,
						type: "shared",
						tableMapTableId: table.id,
					} as SharedMapStorage
					mapList.value.push(newMap)
					setCurrentMap(newMap.id)
					return table
				})
				.catch((err) => {
					console.error(err)
				})
		}
		// TODO: create shared map from template
		if (template.type === "local") {
			return createMapTable(name)
				.then((table) => {
					const newMap = {
						name,
						id: name,
						type: "shared",
						tableMapTableId: table.id,
					} as SharedMapStorage
					mapList.value.push(newMap)
					setCurrentMap(newMap.id)
					return table
				})
				.catch((err) => {
					console.error(err)
				})
		}
		return createMapTable(name).then((table) => {
			const newMap = {
				name,
				id: name,
				type: "shared",
				tableMapTableId: table.id,
			} as SharedMapStorage
			mapList.value.push(newMap)
			setCurrentMap(newMap.id)
			return table
		})
	}
	const setCurrentMap = (id: string | null) => {
		if (!id) {
			currentMap.value = null
			return
		}
		const map = mapList.value.find((map) => map.id === id)
		if (!map) return
		if (map.type === "local") {
			editable.value = true
			isSharedTable.value = false
		}
		currentMap.value = map
		store.value.lastOpened = id
	}
	const renameNode = (node: NodeItem, name: string) => {
		return new Promise((resolve, reject) => {
			if (isSharedTable.value) {
				if (!sharedTableMapTable.value || !editable.value) return reject(new Error("No permission"))
				if (node.category === NodeCategory.TABLE) {
					return bitable.base.setTable(node.meta.id, {
						name,
					}).then(() => {
						addUpdateTask({
							add: [],
							update: [{
								recordId: node.id,
								fields: {
									[nodeRawPropIds.value.name]: name,
									[nodeRawPropIds.value.tableid]: node.meta.id,
								},
							}],
							delete: [],
							callback: () => {
								creatingNode.value = false
								loadTableList().then(loadSharedTable).then((raws) => {
									tableMap.value = raws
									resolve(raws)
								})
							}
						})
					})
				}
				return addUpdateTask({
					add: [],
					update: [{
						recordId: node.id,
						fields: {
							[nodeRawPropIds.value.name]: name,
						},
					}],
					delete: [],
					callback: () => {
						creatingNode.value = false
						loadSharedTable().then((raws) => {
							tableMap.value = raws
							resolve(raws)
						})
					}
				})
			} else {
				if (!currentMap.value) return reject(new Error("No current map"))
				const raw = tableMap.value.find((raw) => raw.id === node.id)
				if (!raw) return reject(new Error("No raw"))
				raw.name = name
				resolve(tableMap.value)
			}
		})
	}
	const deleteNode = (node: NodeItem) => {
		return new Promise((resolve, reject) => {
			if (isSharedTable.value) {
				if (!sharedTableMapTable.value || !editable.value) return reject(new Error("No permission"))
				if (node.category === NodeCategory.TABLE) {
					return bitable.base.deleteTable(node.meta.id).then(() => {
						addUpdateTask({
							add: [],
							update: [],
							delete: [node.id],
							callback: () => {
								creatingNode.value = false
								loadTableList().then(loadSharedTable).then((raws) => {
									tableMap.value = raws
									resolve(raws)
								})
							}
						})
					})
				}
				return addUpdateTask({
					add: [],
					update: [],
					delete: [node.id],
					callback: () => {
						creatingNode.value = false
						loadSharedTable().then((raws) => {
							tableMap.value = raws
							resolve(raws)
						})
					}
				})
			} else {
				if (!currentMap.value) return reject(new Error("No current map"))
				if (node.category === NodeCategory.TABLE) {
					return bitable.base.deleteTable(node.meta.id).then(() => {
						const raw = tableMap.value.find((raw) => raw.id === node.id)
						if (!raw) return reject(new Error("No raw"))
						tableMap.value = tableMap.value.filter((raw) => raw.id !== node.id)
						resolve(tableMap.value)
					})
				}
				const raw = currentMap.value.tableMap.find((raw) => raw.id === node.id)
				if (!raw) return reject(new Error("No raw"))
				currentMap.value.tableMap = currentMap.value.tableMap.filter((raw) => raw.id !== node.id)
				resolve(currentMap.value.tableMap)
			}
		})
	}
	const deleteTableMap = (id: string, deleteSharedTable: boolean = false) => {
		return new Promise((resolve, reject) => {
			const index = mapList.value.findIndex((map) => map.id === id)
			if (index === -1) return reject(new Error("No map"))
			const map = mapList.value[index]
			if (map.type === "shared") {
				if (!sharedTableMapTable.value || !editable.value) return reject(new Error("No permission"))
				if (deleteSharedTable) return bitable.base.deleteTable(sharedTableMapTableId.value as string).then(() => {
					mapList.value = mapList.value.filter((map) => map.id !== id)
					setCurrentMap(mapList.value.length ? mapList.value[Math.min(index, mapList.value.length - 1)].id : null)
					resolve(mapList.value)
				})
				mapList.value = mapList.value.filter((map) => map.id !== id)
				mapList.value = mapList.value.filter((map) => map.id !== id)
				setCurrentMap(mapList.value.length ? mapList.value[Math.min(index, mapList.value.length - 1)].id : null)
				resolve(mapList.value)
			} else {
				mapList.value = mapList.value.filter((map) => map.id !== id)
				setCurrentMap(mapList.value.length ? mapList.value[Math.min(index, mapList.value.length - 1)].id : null)
				resolve(mapList.value)
			}
		})
	}

	watch(curBaseStore, (newVal, oldVal) => {
		console.log("curBaseStore", newVal, oldVal, store.value)
		if (oldVal === null) {
			if (!curBaseStore.value) return
			mapList.value = Object.values(curBaseStore.value)
			if (store.value.lastOpened) {
				setCurrentMap(store.value.lastOpened)
			}
		}
	})

	watch(mapList, () => {
		console.log("mapList", JSON.stringify(mapList.value, null, 2))
		store.value.storage[baseId.value as string] = mapList.value.reduce((prev, curr) => {
			prev[curr.id] = curr
			return prev
		},
		{} as Record<string, MapStorageItem>)
	}, { deep: true })

	watch(currentMap, () => {
		if (!currentMap.value) return tableMap.value = []
		console.log("currentMap", currentMap.value)
		if (currentMap.value.type === "shared") {
			sharedTableMapTableId.value = currentMap.value.tableMapTableId
			isSharedTable.value = true
			const loading = ElLoading.service({
				lock: true,
				background: "rgba(0, 0, 0, 0.7)",
				text: "Loading..."
			})
			loadTableList().then(loadSharedTable).then((raws) => {
				tableMap.value = raws
				loading.close()
			}).catch((e) => {
				console.error(e)
				ElMessage.error({
					message: e.message,
					grouping: true,
				})
				loading.close()
			})
			return
		}
		if (currentMap.value.type === "local") {
			isSharedTable.value = false
			loadTableList().then(loadLocalMap).then((raws) => {
				tableMap.value = raws
			})
		}
	}, {deep: true})

	watch(tableMap, () => {
		if (!tableMap.value.length || !currentMap.value) {
			nodes.value = []
			treeData.value = []
			return
		}
		if (currentMap.value.type === "shared") {
			updateTreeData()
			return
		} else {
			updateTreeData()
		}
	}, { deep: true })

	watch(sharedTableMapTableId, () => {
		if (!sharedTableMapTableId.value) return
		editable.value = false
		getTablePermission(sharedTableMapTableId.value, OperationType.Editable).then((permission) => {
			editable.value = permission
		}).catch((e) => {
			console.error(e)
			editable.value = false
			ElMessage.error({
				message: e.message,
				grouping: true,
			})
		})
	})

	watch(updateTasks, () => {
		console.log("updateTasks", JSON.stringify(updateTasks.value, null, 2))
		updateSharedTable()
	},
	{ deep: true })

	onTableAdd(() => {
		loadTableList().then(()=>{
			if (isSharedTable.value) return loadSharedTable()
			return loadLocalMap()
		}).then((raws)=>{
			tableMap.value = raws
		})
	})

	onTableDelete(() => {
		loadTableList().then(()=>{
			if (isSharedTable.value) return loadSharedTable()
			return loadLocalMap()
		}).then((raws)=>{
			tableMap.value = raws
		})
	})

	onRecordAdd(sharedTableMapTable, () => {
		loadSharedTable().then((raws)=>{
			tableMap.value = raws
		})
	})

	onRecordModify(sharedTableMapTable, () => {
		loadSharedTable().then((raws)=>{
			tableMap.value = raws
		})
	})

	onRecordAdd(sharedTableMapTable, () => {
		loadSharedTable().then((raws)=>{
			tableMap.value = raws
		})
	})

	return {
		sharedTableMapTableId,
		selectSharedTableMapTable,
		treeData,
		tableMap,
		loadSharedTable,
		loadLocalMap,
		loadTableList,
		refreshing,
		editable,
		getTablePermission,
		activeTableId,
		activeTableNodeId,
		addUpdateTask,
		updateSharedTable,
		removeNodeTo,
		getNodeByKey,
		createNode,
		isSharedTable,
		loadViewList,
		mapList,
		currentMap,
		setCurrentMap,
		createMapLocally,
		canAddTable,
		renameNode,
		manageable,
		deleteNode,
		deleteTableMap,
		createSharedMap,
	}
}