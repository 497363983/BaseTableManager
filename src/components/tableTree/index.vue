<script lang="ts" setup>
import treeNode from "./treeNode.vue"
import {
	Search,
	FolderAdd,
	Refresh,
	Plus,
	CloseBold,
	Lock,
	ArrowDown,
	Share,
	Folder,
	Delete,
	MoreFilled,
} from "@element-plus/icons-vue"
import {
	ref,
	watch,
	onMounted,
	nextTick,
	h,
	toRaw,
	computed,
} from "vue"
import type { NodeItem, ViewFolderNode } from "@/types"
import { NodeIcon, NodeCategory } from "@/types"
import {
	ElTree,
	ElMessageBox,
	ElForm,
	ElFormItem,
	ElInput,
	ElMessage,
	ElSelectV2,
	ElRadioGroup,
	ElRadio,
	ElCheckbox,
} from "element-plus"
import { useTableMap, type MapStorageItem } from "./composables"
import type { IFieldConfig } from "@lark-base-open/js-sdk"
import { bitable, FieldType } from "@lark-base-open/js-sdk"
import type Node from "element-plus/es/components/tree/src/model/node"
import type {
	AllowDropType,
	NodeDropType,
} from "element-plus/es/components/tree/src/tree.type"
import AddTableIcon from "@/icons/addTable-icon.vue"
import { useI18n } from "vue-i18n"
import { vOnClickOutside } from "@vueuse/components"
import { useToggle } from "@vueuse/core"
import { getFieldOptions, indexFields, contextmenu, addContextMenuItem } from "./utils"
import RenameIcon from "@/icons/rename-icon.vue"
import contextmenuItem from "./contextMenuItem.vue"

const { t } = useI18n()

// TableMap
const {
	treeData,
	selectSharedTableMapTable,
	loadTableList,
	refreshing,
	activeTableNodeId,
	editable,
	removeNodeTo,
	createNode,
	isSharedTable,
	loadSharedTable,
	tableMap,
	loadViewList,
	mapList,
	currentMap,
	setCurrentMap,
	createMapLocally,
	canAddTable,
	renameNode,
	manageable,
	deleteTableMap,
	createSharedMap,
	deleteNode: deleteNodeItem,
} = useTableMap()

// Search
const searchText = ref("")
const tableTreeRef = ref<InstanceType<typeof ElTree>>()
const filterNode = (value: string, data: NodeItem) => {
	if (!value) return true
	return data.name.includes(value)
}
watch(searchText, (val) => {
	tableTreeRef.value!.filter(val)
})

// Contextmenu
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({
	x: 0,
	y: 0,
})
const contextMenuTriggerRef = ref({
	getBoundingClientRect: () => contextMenuPosition.value,
})
const contextMenuNode = ref<NodeItem>()
const onNodeContextmenu = (e: MouseEvent, data: NodeItem) => {
	contextMenuPosition.value = DOMRect.fromRect({
		x: e.clientX,
		y: e.clientY,
	})
	contextMenuNode.value = data
	contextMenuVisible.value = true
}

// NodeExpand Event
const expandedNodes = ref<string[]>([])
const onNodeExpand = (data: NodeItem) => {
	console.log("expand", data)
	expandedNodes.value.push(data.id)
	if (data.category === NodeCategory.FOLDER && data.children.length > 0) {
		if (typeof data.icon === "string") data.icon = NodeIcon.FOLDER_OPENED
		if (typeof data.icon === "object") data.icon.name = NodeIcon.FOLDER_OPENED
	}
}

// NodeCollapse Event
const onNodeCollapse = (data: NodeItem) => {
	expandedNodes.value = expandedNodes.value.filter((id) => id !== data.id)
	if (data.category === NodeCategory.FOLDER) {
		if (typeof data.icon === "string") data.icon = NodeIcon.FOLDER
		if (typeof data.icon === "object") data.icon.name = NodeIcon.FOLDER
	}
}

// Click Event
const onNodeClick = (data: NodeItem, node: Node) => {
	console.log("click", data, node)
	if (data.category === NodeCategory.TABLE) {
		bitable.ui.switchToTable(data.meta.id)
	}
	if (data.category === NodeCategory.VIEW) {
		bitable.ui.switchToView(data.tableId, data.meta.id)
	}
	if (!node.expanded) {
		nextTick(() => {
			node.expand(()=>{
				onNodeExpand(data)
			}, true)
		})
	}
	if (node.expanded && data.category !== NodeCategory.TABLE) {
		nextTick(() => {
			node.collapse()
			onNodeCollapse(data)
		})
	}
}

// allowDrag
const allowDrag = (node: Node) => {
	const data = node.data as NodeItem
	if (data.category === NodeCategory.VIEW) return false
	if (data.category === NodeCategory.FOLDER && data.tableId) return false
	return true
}

// allowDrop
const allowDrop = (dragging: Node, drop: Node, type: AllowDropType) => {
	const draggingData = dragging.data as NodeItem
	const dropData = drop.data as NodeItem
	if (draggingData.category === NodeCategory.FOLDER && dropData.category === NodeCategory.TABLE) return false
	if (type === "inner") return (dropData.childrenType as NodeCategory[]).includes(draggingData.category)
	if (dropData.tableId) return false
	if (["prev", "next"].includes(type) && dropData.parent === draggingData.parent) return false
	return true
}

/**
 * New Nodes
 */
// newFolder
const canCreateFolder = ref(true)
const newFolder = () => {
	if (!canCreateFolder.value) return
	const currentNodeData = tableTreeRef.value?.getCurrentNode() as	NodeItem
	const creatingFolder = ref(false)
	const disabled = ref(false)
	console.log("ddd",disabled)
	const name = ref<string>()
	ElMessageBox({
		title: t("tips.newFolder"),
		message: () => {
			return h(
				ElForm,
				null,
				{
					default: () => {
						return h(
							ElFormItem,
							{
								label: t("treeNode.folderName"),
							},
							{
								default: () => {
									return h(
										ElInput,
										{
											placeholder: t("placeholder.inputFolderName"),
											modelValue: name.value,
											"onUpdate:modelValue": (val: string) => {
												name.value = val
											},
										}
									)
								}
							}
						)
					}
				}
			)
		},
		showCancelButton: true,
		confirmButtonText: t("messageBox.confirm"),
		cancelButtonText: t("messageBox.cancel"),
		autofocus: true,
		lockScroll: true,
		beforeClose: (action, instance, done) => {
			if (creatingFolder.value) return
			if (action !== "confirm") return done()
			if (!name.value) {
				ElMessage({
					type: "warning",
					message: t("placeholder.inputFolderName"),
					grouping: true,
				})
				return
			}
			creatingFolder.value = true
			instance.confirmButtonLoading = true
			disabled.value = true
			createNode({
				type: NodeCategory.FOLDER,
				name: toRaw(name.value),
				parent: currentNodeData
			}).catch((e)=>{
				console.error(e)
				done()
			}).finally(() => {
				creatingFolder.value = false
				done()
			})
		},
	})
}

// newTable
const tableDialogRef = ref()
const canCreateTable = ref(true)
const tableDialogVisible = ref(false)
const toggleTableDialog = useToggle(tableDialogVisible)
const newTableName = ref<string>()
const newTableParent = ref<NodeItem | null>(null)
const newTableFields = ref<IFieldConfig[]>([
	{
		type: FieldType.Text,
		name: "Text",
	}
])
const creatingTable = ref(false)
const resetTableFields = () => {
	newTableFields.value = [
		{
			type: FieldType.Text,
			name: "Text",
		}
	]
}
const addField = () => {
	newTableFields.value.push({
		type: FieldType.Text,
		name: "Text" + newTableFields.value.length,
	})
}
const deleteField = (index: number) => {
	newTableFields.value.splice(index, 1)
}
const openTableDialog = () => {
	const currentNodeData = tableTreeRef.value?.getCurrentNode() as	NodeItem
	newTableParent.value = currentNodeData
	toggleTableDialog()
}
const newTable = () => {
	if (!newTableName.value) {
		ElMessage({
			type: "warning",
			message: t("placeholder.inputTableName"),
			grouping: true,
		})
		return
	}
	creatingTable.value = true
	createNode({
		type: NodeCategory.TABLE,
		name: toRaw(newTableName.value),
		tableConfig: {
			fields: toRaw(newTableFields.value)
		},
		parent: toRaw(newTableParent.value)
	}).then((tableId) => {
		toggleTableDialog()
		bitable.ui.switchToTable(tableId)
		creatingTable.value = false
		resetTableFields()
		newTableName.value = ""
	}).catch((e) => {
		creatingTable.value = false
		console.error(e)
	})
}

// refresh
const refresh = () => {
	refreshing.value = true
	if (isSharedTable.value) {
		loadTableList().then(loadSharedTable).then((raws) => {
			tableMap.value = raws
			refreshing.value = false
		}).catch((err) => {
			console.error(err)
			refreshing.value = false
		})
	}
	else {
		loadTableList().then(loadTableList).catch((err) => {
			console.error(err)
		})
	}
	contextMenuVisible.value = false
}
addContextMenuItem({
	icon: Refresh,
	text: "tips.refresh",
	onClick: refresh,
	permission: true
})

// newMap
const creatingMap = ref(false)
const newMap = (_type?: "shared" | "local") => {
	const name = ref<string>()
	const template = ref<string>()
	const type = ref<"shared" | "local">(_type || "local")
	ElMessageBox({
		title: t("treeNode.newTableMap"),
		message: () => {
			return h(
				ElForm,
				{
					labelPosition: "top",
				},
				{
					default: () => {
						return [
							h(
								ElFormItem,
								{
									label: t("treeNode.tableMapName"),
									required: true,
								},
								{
									default: () => {
										return h(
											ElInput,
											{
												placeholder: t("placeholder.inputTableMapName"),
												modelValue: name.value,
												"onUpdate:modelValue": (val: string) => {
													name.value = val
												},
											}
										)
									}
								}
							),
							h(
								ElFormItem,
								{
									label: t("treeNode.tableMapType"),
								},
								{
									default: () => {
										return h(
											ElSelectV2,
											{
												options: [
													{
														label: t("treeNode.sharedTableMap"),
														value: "shared",
													},
													{
														label: t("treeNode.localTableMap"),
														value: "local",
													}
												],
												modelValue: type.value,
												"onUpdate:modelValue": (val: "shared" | "local") => {
													type.value = val
												},
											}
										)
									}
								}
							),
							// TODO: 模板选择
							// h(
							// 	ElFormItem,
							// 	{
							// 		label: t("treeNode.tableMapTemplate"),
							// 	},
							// 	{
							// 		default: () => {
							// 			return h(
							// 				ElSelectV2,
							// 				{
							// 					options: mapList.value.map((item) => {
							// 						return {
							// 							label: item.name,
							// 							value: item.id,
							// 						}
							// 					}),
							// 					modelValue: template.value,
							// 					"onUpdate:modelValue": (val: string) => {
							// 						template.value = val
							// 					},
							// 					clearable: true,
							// 					filterable: true,
							// 				}
							// 			)
							// 		}
							// 	}
							// )
						]
					}
				}
			)
		},
		showCancelButton: true,
		confirmButtonText: t("messageBox.confirm"),
		cancelButtonText: t("messageBox.cancel"),
		autofocus: true,
		lockScroll: true,
		beforeClose: (action, instance, done) => {
			if (creatingMap.value) return
			if (action !== "confirm") return done()
			if (!name.value) {
				ElMessage({
					type: "warning",
					message: t("placeholder.inputTableMapName"),
					grouping: true,
				})
				return
			}
			instance.confirmButtonLoading = true
			creatingMap.value = true
			if (type.value === "local") {
				createMapLocally(name.value, template.value)
				creatingMap.value = false
				done()
			}
			if (type.value === "shared") {
				createSharedMap(name.value).then(() => {
					done()
				}).catch((err) => {
					console.error(err)
				}).finally(() => {
					creatingMap.value = false
					instance.confirmButtonLoading = false
				})
			}
		}
	})
}

// renameNode
const renaming = ref(false)
const canRename = computed(() => {
	if (!contextMenuNode.value) return false
	if (contextMenuNode.value.category === NodeCategory.TABLE) return manageable.value
	if (contextMenuNode.value.category === NodeCategory.VIEW) return false
	if (contextMenuNode.value.category === NodeCategory.FOLDER) {
		if (contextMenuNode.value.tableId) return false
		return editable.value
	}
	return true
})
const rename = () => {
	if (isSharedTable.value && !editable) return
	const _name = ref<string | undefined>(contextMenuNode.value?.name)
	ElMessageBox({
		title: t("treeNode.rename"),
		message: () => {
			return h(
				ElForm,
				{
					labelPosition: "top",
				},
				{
					default: () => {
						return h(
							ElFormItem,
							{
								label: t("placeholder.inputNewName"),
								required: true,
							},
							{
								default: () => {
									return h(
										ElInput,
										{
											placeholder: t("placeholder.inputNewName"),
											modelValue: _name.value,
											"onUpdate:modelValue": (val: string) => {
												_name.value = val
											},
										}
									)
								}
							}
						)
					}
				}
			)
		},
		showCancelButton: true,
		confirmButtonText: t("messageBox.confirm"),
		cancelButtonText: t("messageBox.cancel"),
		autofocus: true,
		lockScroll: true,
		beforeClose: (action, instance, done) => {
			if (renaming.value || !contextMenuNode.value) return
			if (action !== "confirm") return done()
			if (!_name.value) {
				ElMessage({
					type: "warning",
					message: t("placeholder.inputNewName"),
					grouping: true,
				})
				return
			}
			instance.confirmButtonLoading = true
			renaming.value = true
			if (_name.value === contextMenuNode.value.name) {
				renaming.value = false
				done()
				return
			}
			renameNode(contextMenuNode.value, _name.value).then(() => {
				done()
			}).catch((err) => {
				console.error(err)
			}).finally(() => {
				renaming.value = false
				instance.confirmButtonLoading = false
			})
		}
	})
	contextMenuVisible.value = false
}
addContextMenuItem({
	icon: RenameIcon,
	text: "treeNode.rename",
	onClick: rename,
	permission: canRename,
})

// deleteMap
const deletingMap = ref(false)
const deleteMap = (store: MapStorageItem) => {
	if (manageable.value && store.type === "shared") {
		const isDeleteSharedTable = ref(false)
		ElMessageBox({
			title: t("treeNode.deleteTableMap"),
			message: () => {
				return h(
					"div",
					null,
					[
						h(
							"p",
							null,
							t("treeNode.confirmDeleteSharedTableMap", { name: store.name })
						),
						h(
							ElRadioGroup,
							{
								modelValue: isDeleteSharedTable.value,
								"onUpdate:modelValue": (val) => {
									isDeleteSharedTable.value = val as boolean
								},
							},
							{
								default: () => [
									h(
										ElRadio,
										{
											label: false,
										},
										{
											default: () => t("treeNode.onlyLocalMap")
										}
									),
									h(
										ElRadio,
										{
											label: true,
											disabled: !manageable.value,
										},
										{
											default: () => t("treeNode.deleteSharedTableMap")
										}
									)
								]
							}
						)
					]
				)
			},
			showCancelButton: true,
			confirmButtonText: t("messageBox.confirm"),
			cancelButtonText: t("messageBox.cancel"),
			autofocus: true,
			type: "warning",
			lockScroll: true,
			beforeClose: (action, instance, done) => {
				if (deletingMap.value) return
				if (action !== "confirm") return done()
				instance.confirmButtonLoading = true
				deleteTableMap(store.id, isDeleteSharedTable.value).then(() => {
					done()
				}).catch((err) => {
					console.error(err)
					ElMessage({
						type: "error",
						message: t("messageBox.deleteFailed"),
						grouping: true,
					})
				}).finally(() => {
					instance.confirmButtonLoading = false
				})
			}
		})
	} else {
		ElMessageBox({
			title: t("treeNode.deleteTableMap"),
			message: t("treeNode.confirmDeleteLocalTableMap", { name: store.name }),
			showCancelButton: true,
			confirmButtonText: t("messageBox.confirm"),
			cancelButtonText: t("messageBox.cancel"),
			autofocus: true,
			type: "warning",
			lockScroll: true,
			beforeClose: (action, instance, done) => {
				if (deletingMap.value) return
				if (action !== "confirm") return done()
				instance.confirmButtonLoading = true
				deleteTableMap(store.id).then(() => {
					done()
				}).catch((err) => {
					console.error(err)
					ElMessage({
						type: "error",
						message: t("messageBox.deleteFailed"),
						grouping: true,
					})
				}).finally(() => {
					instance.confirmButtonLoading = false
				})
			}
		})
	}
}

// deleteNode
const deletingNode = ref(false)
const canDelete = computed(() => {
	if (!contextMenuNode.value) return false
	if (contextMenuNode.value.category === NodeCategory.TABLE) return manageable.value
	if (contextMenuNode.value.category === NodeCategory.VIEW) return false
	if (contextMenuNode.value.category === NodeCategory.FOLDER) {
		if (contextMenuNode.value.tableId) return false
		return editable.value
	}
	return true
})
const notAskOnDelete = ref(false)
const deleNode = () => {
	if (!contextMenuNode.value) return
	if (notAskOnDelete.value) {
		deletingNode.value = true
		return deleteNodeItem(contextMenuNode.value).catch((err) => {
			console.error(err)
		}).finally(() => {
			deletingNode.value = false
		})
	}
	const tempAskOnDelete = ref<boolean>(notAskOnDelete.value)
	ElMessageBox({
		title: t(
			"treeNode.deleteNode",
			{
				name: t(`treeNode.${contextMenuNode.value.category.toLowerCase()}`)
			}
		),
		showCancelButton: true,
		confirmButtonText: t("messageBox.confirm"),
		cancelButtonText: t("messageBox.cancel"),
		autofocus: true,
		type: "warning",
		confirmButtonClass: "el-button--danger",
		lockScroll: true,
		message: () => {
			return h(
				"div",
				{
					style: {
						display: "flex",
						flexDirection: "column",
					}
				},
				[
					t(
						"treeNode.confirmDeleteNode",
						{
							name: contextMenuNode.value!.name
						}
					),
					h(
						ElCheckbox,
						{
							modelValue: tempAskOnDelete.value,
							"onUpdate:modelValue": (val) => {
								tempAskOnDelete.value = val as boolean
							},
						},
						{
							default: () => t(
								"treeNode.notAskNextTime",
								{
									name: contextMenuNode.value!.name
								})
						}
					)
				]
			)
		},
		beforeClose: (action, instance, done) => {
			if (deletingNode.value) return
			if (action !== "confirm") return done()
			instance.confirmButtonLoading = true
			deletingNode.value = true
			notAskOnDelete.value = tempAskOnDelete.value
			deleteNodeItem(contextMenuNode.value!).then(() => {
				done()
			}).catch((err) => {
				console.error(err)
				ElMessage({
					type: "error",
					message: t("messageBox.deleteFailed"),
					grouping: true,
				})
			}).finally(() => {
				instance.confirmButtonLoading = false
				deletingNode.value = false
			})
		}
	})
}
addContextMenuItem({
	icon: Delete,
	text: "treeNode.deleteNode",
	onClick: deleNode,
	permission: canDelete,
})

// onCurrentChange
const activeTableNode = ref<Node>()
const onCurrentChange = (data: NodeItem, node: Node) => {
	console.log("current", data, node)
	if (!data) {
		canCreateTable.value = true
		canCreateFolder.value = true
		return
	}
	if (data && data.category === NodeCategory.TABLE) {
		if (
			activeTableNode.value
			&& activeTableNode.value.expanded
		) activeTableNode.value.collapse()
		activeTableNode.value = node
	}
	if (
		!data.childrenType.includes(NodeCategory.FOLDER as never)
		|| data.category === NodeCategory.TABLE
		|| data.category === NodeCategory.VIEW
	) canCreateFolder.value = false
	else canCreateFolder.value = true
	if (
		!data.childrenType.includes(NodeCategory.TABLE as never)
		|| data.category === NodeCategory.TABLE
		|| data.category === NodeCategory.VIEW
	) canCreateTable.value = false
	else canCreateTable.value = true
}
// onDrop
const onDrop = (
	draggingNode: Node,
	dropNode: Node,
	dropType: NodeDropType,
	event: DragEvent
) => {
	event.preventDefault()
	console.log(event)
	if (dropType === "inner") removeNodeTo(draggingNode.data as NodeItem, dropNode.data as NodeItem, () => {
		dropNode.loadData(() => {
			dropNode.expand(()=>{}, true)
		})
	})
	if (["before", "after"].includes(dropType)) {
		const parent = (dropNode.data as NodeItem).parent
		removeNodeTo(draggingNode.data as NodeItem, parent)
	}
}

// Lazy Load View
const isLeaf = (data: NodeItem) => {
	if (data.category === NodeCategory.VIEW) return true
	if (
		data.category === NodeCategory.FOLDER
		&& data.tableId
		&& data.lazy
	) return false
	return data.children?.length === 0
}
const load = (node: Node, resolve: (data: NodeItem[]) => void) => {
	console.log("load", node)
	if (node.level === 0) return resolve(node.data as NodeItem[])
	const data = node.data as NodeItem
	if (
		data.category === NodeCategory.FOLDER
		&& data.childrenType.includes(NodeCategory.VIEW as never)
		&& data.tableId
	) {
		return loadViewList(data as ViewFolderNode).then((views) => {
			resolve(views)
			data.children = views
		}).then(()=>{
			console.log("loadViewList", node)
		}).catch((err) => {
			console.error(err)
			resolve([])
		})
	}
	if (data.children) return resolve(node.data.children)
	return resolve([])
}

// onClickOutside
const topGroupRef = ref()
const menuRef = ref()
const onClickOutside = [
	() => {
		canCreateFolder.value = true
		canCreateTable.value = true
		tableTreeRef.value?.setCurrentKey(undefined)
	},
	{ ignore: [topGroupRef, tableDialogRef, menuRef] }
]

watch(
	activeTableNodeId,
	(newVal, oldVal)=>{
		console.log("activeTableNodeId",newVal)
		if (!newVal) return
		if (newVal === oldVal) return
		const currentKey = tableTreeRef.value?.getCurrentKey()
		if (currentKey !== newVal) nextTick(() => {
			tableTreeRef.value?.setCurrentKey(newVal, true)
			const node = tableTreeRef.value?.getNode(newVal)
			if (node) {
				if (!node.expanded) node.expand(()=>{
					onNodeExpand(node.data as NodeItem)
				}, true)
				activeTableNode.value = node
			}
		})
		if (activeTableNode.value) nextTick(() => {
			activeTableNode.value?.expanded && activeTableNode.value?.collapse()
			if (activeTableNode.value) onNodeCollapse(activeTableNode.value.data as NodeItem)
		})
		if (!newVal) return
		const node = tableTreeRef.value?.getNode(newVal)
		if (node) {
			nextTick(()=>{
				if (!node.expanded) node.expand(()=>{
					onNodeExpand(node.data as NodeItem)
				}, true)
				activeTableNode.value = node
			})
		}
	},
	{ immediate: true }
)

// Watch Nodes Update
watch(
	() => treeData,
	() => {
		if (refreshing.value) {
			nextTick(() =>{
				console.log(expandedNodes.value)
				expandedNodes.value.forEach((id) => {
					const node = tableTreeRef.value?.getNode(id)
					console.log(node)
					if (node) {
						const data = node.data as NodeItem
						node.expand(() => {
							onNodeExpand(data)
						}, false)
					}
					else expandedNodes.value = expandedNodes.value.filter((i) => i !== id)
				})
				refreshing.value = false
				if (activeTableNodeId.value) tableTreeRef.value?.setCurrentKey(activeTableNodeId.value, true)
			})
		}
	},
	{ deep: true }
)

onMounted(() => {
	loadTableList().catch((err) => {
		console.error(err)
	})
})

</script>

<template>
	<div v-if="treeData.length">
		<el-row
			ref="topGroupRef"
			style="margin-bottom: 5px;"
			justify="space-between"
		>
			<el-col>
				<el-input
					v-model="searchText"
					:prefix-icon="Search"
					:placeholder="$t('placeholder.search')"
					clearable
				/>
			</el-col>
		</el-row>
		<el-row
			ref="menuRef"
			justify="space-between"
		>
			<el-col :span="14">
				<el-dropdown
					trigger="click"
					:visible-arrow="false"
					@command="setCurrentMap"
				>
					<div class="map-select">
						<el-text
							style="cursor: pointer;align-items: center;display: flex;"
							truncated
						>
							<el-icon v-if="currentMap && currentMap.type === 'shared'">
								<Share />
							</el-icon>
							<el-icon v-else>
								<Folder />
							</el-icon>
							{{ currentMap?.name || $t("tips.noTableMap") }}
							<el-icon
								class="el-icon--right"
								size="large"
							>
								<ArrowDown />
							</el-icon>
						</el-text>
					</div>
					<template #dropdown>
						<el-dropdown-menu class="map-list">
							<el-dropdown-item
								v-for="item of mapList"
								:key="item.id"
								:command="item.id"
								:icon="item.type === 'shared' ? Share : Folder"
							>
								<el-row style="width: 100%;">
									<el-col
										:span="20"
										style="display: flex;align-items: center;"
									>
										<el-text
											truncated
											:title="item.name"
										>
											{{ item.name }}
										</el-text>
									</el-col>
									<el-col :span="4">
										<el-link
											class="delete-map el-icon--right"
											:underline="false"
											type="danger"
											@click="deleteMap(item)"
										>
											<el-icon>
												<CloseBold />
											</el-icon>
										</el-link>
									</el-col>
								</el-row>
							</el-dropdown-item>
						</el-dropdown-menu>
					</template>
				</el-dropdown>
				<div
					class="map-select"
					style="display: inline-flex;"
				>
					<el-dropdown trigger="click">
						<el-icon size="large">
							<Plus />
						</el-icon>
						<template #dropdown>
							<el-dropdown-menu>
								<el-dropdown-item
									:icon="MoreFilled"
									@click="selectSharedTableMapTable()"
								>
									{{ $t("tips.selectTableMap") }}
								</el-dropdown-item>
								<el-dropdown-item
									:icon="Plus"
									@click="newMap()"
								>
									{{ $t("treeNode.newTableMap") }}
								</el-dropdown-item>
							</el-dropdown-menu>
						</template>
					</el-dropdown>
				</div>
			</el-col>
			<el-col :span="10">
				<el-row justify="end">
					<el-button-group>
						<el-tooltip>
							<template #content>
								{{ $t("tips.newTable") }}
							</template>
							<el-button
								:disabled="!editable || !canCreateTable"
								:icon="AddTableIcon"
								type="primary"
								size="small"
								@click="openTableDialog()"
							/>
						</el-tooltip>
						<el-tooltip>
							<template #content>
								{{ $t("tips.newFolder") }}
							</template>
							<el-button
								type="primary"
								:disabled="!editable || !canCreateFolder"
								:icon="FolderAdd"
								size="small"
								@click="newFolder()"
							/>
						</el-tooltip>
						<el-tooltip>
							<template #content>
								{{ $t("tips.refresh") }}
							</template>
							<el-button
								:icon="Refresh"
								type="primary"
								:loading-icon="Refresh"
								:loading="refreshing"
								size="small"
								@click="refresh()"
							/>
						</el-tooltip>
					</el-button-group>
				</el-row>
			</el-col>
		</el-row>
		<el-scrollbar height="75vh">
			<div style="padding: 10px;">
				<el-tree
					ref="tableTreeRef"
					v-on-click-outside="onClickOutside"
					style="width: 100%;"
					:data="treeData"
					:expand-on-click-node="false"
					:filter-node-method="filterNode"
					:allow-drop="allowDrop"
					:allow-drag="allowDrag"
					render-after-expand
					highlight-current
					:draggable="editable"
					node-key="id"
					:props="{
						isLeaf: isLeaf,
					}"
					lazy
					:load="load"
					@node-collapse="onNodeCollapse"
					@node-expand="onNodeExpand"
					@current-change="onCurrentChange"
					@node-click="onNodeClick"
					@node-contextmenu="onNodeContextmenu"
					@node-drag-end="onDrop"
				>
					<template #default="{ data }">
						<treeNode :node="data" />
					</template>
				</el-tree>
			</div>
		</el-scrollbar>
	</div>
	<div v-else>
		<el-scrollbar max-height="90vh">
			<div style="padding: 10px;">
				<p>
					<el-text
						type="info"
						size="large"
					>
						{{ $t("tips.noTableMap") }}
					</el-text>
				</p>
				<div style="display: flex;justify-content: center;margin: 20px 0 20px 0;">
					<el-button
						:disabled="!canAddTable"
						type="primary"
						size="large"
						style="width: 100%;text-wrap: wrap;"
						@click="newMap('shared')"
					>
						{{ $t("tips.autoCreateTableMap") }}
					</el-button>
				</div>
				<p>
					<el-text
						type="info"
						size="large"
					>
						{{ $t("tips.autoCreateToShare") }}
					</el-text>
				</p>
				<p>
					<el-text
						type="info"
						size="large"
					>
						{{ `${$t("tips.createTableMapManually")}${$t("tips.structureReferTo")}` }}
						<el-link
							target="_blank"
							href="https://dkywk0xucr.feishu.cn/docx/UZJ6dxKPCoeOJAxBqfacu0UVnad#BxWvdax2XogB3WxnvoSchlZxnie"
						>
							{{ $t("usageGuide") }}
						</el-link>
					</el-text>
				</p>
				<div style="display: flex;justify-content: center;margin: 20px 0 20px 0;">
					<el-button
						type="primary"
						size="large"
						style="width: 100%;text-wrap: wrap;"
						@click="selectSharedTableMapTable()"
					>
						{{ $t("tips.selectTableMap") }}
					</el-button>
				</div>
				<p>
					<el-text
						type="info"
						size="large"
					>
						{{ $t("tips.createLocallyTip") }}
					</el-text>
				</p>
				<div style="display: flex;justify-content: center;margin: 20px 0 20px 0;">
					<el-button
						type="primary"
						size="large"
						style="width: 100%;text-wrap: wrap;"
						@click="newMap('local')"
					>
						{{ $t("tips.createTableMapLocally") }}
					</el-button>
				</div>
			</div>
		</el-scrollbar>
	</div>
	<el-popover
		v-model:visible="contextMenuVisible"
		trigger="contextmenu"
		:show-arrow="false"
		placement="bottom-start"
		:virtual-ref="contextMenuTriggerRef"
		:hide-after="0"
		virtual-triggering
		popper-style="padding: 5px;border: 0;"
	>
		<ul class="el-dropdown-menu">
			<template
				v-for="(item, index) of contextmenu"
			>
				<contextmenuItem
					v-if="editable && item.permission"
					:key="index"
					:icon="item.icon"
					:text="$t(item.text)"
					@click="item.onClick()"
				/>
			</template>
		</ul>
	</el-popover>
	<el-dialog
		ref="tableDialogRef"
		v-model="tableDialogVisible"
		:title="$t('treeNode.createTable')"
		lock-scroll
		fullscreen
	>
		<el-scrollbar height="60vh">
			<el-form
				style="padding: 10px;"
				label-position="top"
			>
				<el-form-item
					:label="$t('treeNode.tableName')"
					required
				>
					<el-input
						v-model="newTableName"
						:disabled="creatingTable"
						:placeholder="$t('treeNode.tableName')"
					/>
				</el-form-item>
				<el-form-item>
					<template #label>
						<span>{{ $t("treeNode.tableFields") }}</span>
						<el-button
							size="small"
							style="margin-left: 5px;"
							:disabled="creatingTable"
							:icon="Plus"
							@click="addField()"
						/>
					</template>
					<el-table
						:data="newTableFields"
						max-height="250"
						stripe
					>
						<el-table-column
							type="index"
							:index="(i) => i+1"
						>
							<template #default="{ $index }">
								<el-icon v-if="$index === 0">
									<Lock />
								</el-icon>
								<span v-else>{{ $index + 1 }}</span>
							</template>
						</el-table-column>
						<el-table-column
							prop="name"
							max-height="250"
							:label="$t('treeNode.fieldName')"
						>
							<template #default="{ row }">
								<el-input
									v-model="row.name"
									:disabled="creatingTable"
									:placeholder="$t('treeNode.fieldName')"
								/>
							</template>
						</el-table-column>
						<el-table-column :label="$t('treeNode.fieldType')">
							<template #default="{ row, $index }">
								<el-select-v2
									v-model="row.type"
									:disabled="creatingTable"
									:options="getFieldOptions( $index === 0 ? indexFields : undefined)"
									filterable
								>
									<template #default="{item}">
										<span style="margin-right: 5px; position: relative; right: 0px">
											<el-icon><component :is="item.icon" /></el-icon>
										</span>
										<span style="user-select: none">{{ item.label }}</span>
									</template>
								</el-select-v2>
							</template>
						</el-table-column>
						<el-table-column width="70">
							<template #default="{ $index }">
								<el-button
									v-if="$index !== 0"
									:disabled="creatingTable"
									:icon="CloseBold"
									type="danger"
									@click="deleteField($index)"
								/>
							</template>
						</el-table-column>
					</el-table>
				</el-form-item>
			</el-form>
		</el-scrollbar>
		<template #footer>
			<el-button
				:disabled="creatingTable"
				@click="resetTableFields()"
			>
				{{ $t("messageBox.cancel") }}
			</el-button>
			<el-button
				type="primary"
				:loading="creatingTable"
				:disabled="creatingTable"
				@click="newTable()"
			>
				{{ $t("messageBox.confirm") }}
			</el-button>
		</template>
	</el-dialog>
</template>
<style>
.el-tree-node.is-drop-inner {
	background-color: var(--el-tree-node-hover-bg-color);
}
.map-select {
	border-radius: 4px;
	padding: 5px;
	cursor: pointer;
}
.map-select:hover {
	background-color: var(--el-fill-color-light);
}
.map-list a.delete-map {
	color: var(--el-text-color-regular) !important;
}
.map-list a.delete-map:hover {
	color: var(--el-link-hover-text-color) !important;
}
</style>