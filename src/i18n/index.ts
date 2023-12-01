import { createI18n } from "vue-i18n"
import { en } from "./en"
import { zh } from "./zh"

export const i18n = createI18n({
	locale: "en",
	legacy: false,
	fallbackLocale: "en",
	messages: {
		zh,
		en,
	},
})
