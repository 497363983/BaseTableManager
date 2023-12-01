import { ViewType } from "@lark-base-open/js-sdk"
import { NodeIcon } from "@/types"

export const viewList = {
	[ViewType.Grid]: {
		name: "Grid",
		type: ViewType.Grid,
		icon: {
			name: NodeIcon.GRID,
			color: "#8baaf9",
		},
	},
	[ViewType.Kanban]: {
		name: "Kanban",
		type: ViewType.Kanban,
		icon: {
			name: NodeIcon.KANBAN,
			color: "#5b9c44",
		},
	},
	[ViewType.Calendar]: {
		name: "Calendar",
		type: ViewType.Calendar,
		icon: {
			name: NodeIcon.CALENDAR,
			color: "#4c9d8e",
		},
	},
	[ViewType.Gallery]: {
		name: "Gallery",
		type: ViewType.Gallery,
		icon: {
			name: NodeIcon.GALLERY,
			color: "#8558e4",
		},
	},
	[ViewType.Form]: {
		name: "Form",
		type: ViewType.Form,
		icon: {
			name: NodeIcon.FORM,
			color: "#e68e3b",
		},
	},
	[ViewType.Gantt]: {
		name: "Gantt",
		type: ViewType.Gantt,
		icon: {
			name: NodeIcon.GANTT,
			color: "#b3518b",
		},
	},
	[ViewType.Hierarchy]: {
		name: "Hierarchy",
		type: ViewType.Hierarchy,
		icon: NodeIcon.HIERARCHY,
	},
	[ViewType.WidgetView]: {
		name: "WidgetView",
		type: ViewType.WidgetView,
		icon: NodeIcon.WIDGETVIEW,
	},
}