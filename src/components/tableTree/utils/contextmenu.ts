import { ref, type Component, MaybeRefOrGetter } from "vue"

interface ContextMenuItem {
	icon: Component
	text: string
	onClick: () => void
	permission: MaybeRefOrGetter<boolean>
}

export const contextmenu = ref<Array<ContextMenuItem>>([])
export const addContextMenuItem = (item: ContextMenuItem) => {
	const index = contextmenu.value.findIndex((i) => i.text === item.text)
	if (index !== -1) {
		contextmenu.value.splice(index, 1)
	}
	contextmenu.value.push(item)
}