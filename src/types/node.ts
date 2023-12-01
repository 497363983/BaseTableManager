import type { ITableMeta, IViewMeta } from "@lark-base-open/js-sdk"

export enum NodeCategory {
	TABLE = "Table",
	FOLDER = "Folder",
	VIEW = "View",
}

export enum NodeIcon {
	TABLE = "Table",
	FOLDER = "Folder",
	FOLDER_OPENED = "FolderOpened",
	GRID = "Grid",
	KANBAN = "Kanban",
	CALENDAR = "Calendar",
	GALLERY = "Gallery",
	FORM = "Form",
	GANTT = "Gantt",
	HIERARCHY = "Hierarchy",
	WIDGETVIEW = "WidgetView",
}

export interface NodeRaw {
	id: string
	name: string
	category: NodeCategory
	parent: string | null
	tableid: string | null
}

export interface NodeIconConfig<T = NodeIcon> {
	name: T
	color: string
}

export interface Node<NodeMeta = unknown, C = Array<NodeCategory>> extends Record<string, unknown> {
	meta: NodeMeta
	name: string
	category: NodeCategory
	id: string
	children: Array<unknown> | null
	parent: string | null
	icon: NodeIcon | NodeIconConfig
	childrenType: C
}

export type NodeItem = TableNode | FolderNode | ViewNode | SubTableFolderNode | ViewFolderNode

export type FolderMeta = {
	name: string
}

export interface FolderNode extends Node {
	meta: FolderMeta
	category: NodeCategory.FOLDER
	children: NodeItem[]
	icon: NodeIcon.FOLDER | NodeIcon.FOLDER_OPENED | NodeIconConfig<NodeIcon.FOLDER | NodeIcon.FOLDER_OPENED>
}

export interface SubTableFolderNode extends FolderNode {
	children: (TableNode | FolderNode)[]
	tableId: string
	childrenType: [NodeCategory.TABLE, NodeCategory.FOLDER]
}

export interface ViewFolderNode extends FolderNode {
	children: ViewNode[]
	tableId: string
	childrenType: [NodeCategory.VIEW]
	lazy: boolean
}

export interface ViewNode extends Node {
	meta: IViewMeta
	category: NodeCategory.VIEW
	children: null
	tableId: string
}

export interface TableNode extends Node {
	meta: ITableMeta
	category: NodeCategory.TABLE
	children: [ViewFolderNode, SubTableFolderNode]
	icon: NodeIcon.TABLE | NodeIconConfig<NodeIcon.TABLE>
	childrenType: [NodeCategory.FOLDER]
}