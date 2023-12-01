<script lang="ts" setup>
import { NodeIcon, NodeIconConfig } from "@/types"
import { computed } from "vue"
import GridIcon from "@/icons/grid-icon.vue"
import TableIcon from "@/icons/table-icon.vue"
import KanbanIcon from "@/icons/kanban-icon.vue"
import CalenderIcon from "@/icons/calender-icon.vue"
import GanttIcon from "@/icons/gantt-icon.vue"
import GalleryIcon from "@/icons/gallery-icon.vue"
import FormIcon from "@/icons/form-icon.vue"
import ViewIcon from "@/icons/view-icon.vue"
import { Folder, FolderOpened } from "@element-plus/icons-vue"

const props = defineProps<{
	icon: NodeIcon | NodeIconConfig
	size: "small" | "default" | "large"
}>()

const iconList = {
	[NodeIcon.TABLE]: TableIcon,
	[NodeIcon.KANBAN]: KanbanIcon,
	[NodeIcon.GRID]: GridIcon,
	[NodeIcon.FOLDER]: Folder,
	[NodeIcon.FOLDER_OPENED]: FolderOpened,
	[NodeIcon.CALENDAR]: CalenderIcon,
	[NodeIcon.GANTT]: GanttIcon,
	[NodeIcon.GALLERY]: GalleryIcon,
	[NodeIcon.FORM]: FormIcon,
	[NodeIcon.WIDGETVIEW]: ViewIcon,
	[NodeIcon.HIERARCHY]: ViewIcon,
}

const iconNode = computed(() => {
	const icon = typeof props.icon === "string" ? props.icon : props.icon?.name
	if (iconList[icon]) {
		return iconList[icon]
	}
	return ViewIcon
})

const iconColor = computed(() => {
	if (typeof props.icon === "string") {
		return undefined
	}
	return props.icon?.color
})

</script>

<template>
	<el-icon
		:size="size"
		:color="iconColor"
	>
		<component :is="iconNode" />
	</el-icon>
</template>
