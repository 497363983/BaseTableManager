<script lang="ts" setup>
import type { Component } from "vue"
defineProps<{
	icon?: Component
	text: string
}>()

</script>

<template>
	<li class="contextmenu__item">
		<el-row>
			<el-col
				:span="4"
				class="contextmenu__item__icon"
			>
				<el-icon>
					<component :is="icon" />
				</el-icon>
			</el-col>
			<el-col
				:span="16"
				class="contextmenu__item__text"
			>
				<el-text truncated>
					{{ text }}
				</el-text>
			</el-col>
		</el-row>
	</li>
</template>
<style scoped>
.contextmenu__item {
	padding: 2px 0;
	border-radius: 4px;
	cursor: pointer;
	margin-bottom: 1px;
}
.contextmenu__item:hover {
	background-color: var(--el-fill-color-light);
}
.contextmenu__item__icon {
	display: flex;
  justify-content: center;
  align-items: center;
}
.contextmenu__item__text {
	display: flex;
	align-items: center;
}
</style>