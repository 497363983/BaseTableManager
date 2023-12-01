<script lang="ts" setup>
import type { NodeItem } from "@/types"
import nodeIcon from "./nodeIcon.vue"
import { ref } from "vue"

const nodeItemRef = ref()

defineProps<{
	node: NodeItem
}>()
</script>

<template>
	<div
		ref="nodeItemRef"
		style="width: 100%;"
	>
		<nodeIcon
			size="default"
			:icon="node.icon"
		/>
		<el-text
			class="el-tree-node__label"
			style="margin-left: 5px;"
			truncated
			size="default"
		>
			{{ node.name }}
		</el-text>
	</div>
</template>

<style scoped>
.node-name {
	margin-left: 5px;
	font-size: 14px;
}
</style>