<script lang="ts" setup>
import { Link } from "@element-plus/icons-vue"
import { useDark } from "@vueuse/core"
import { useTheme } from "@qww0302/use-bitable"
import { ThemeModeType } from "@lark-base-open/js-sdk"
import tableTree from "@/components/tableTree/index.vue"
import { bitable } from "@lark-base-open/js-sdk"
import { i18n } from "@/i18n"
import { ref } from "vue"
import { QuestionFilled } from "@element-plus/icons-vue"
// @ts-expect-error no .d.ts
import zhCn from "element-plus/dist/locale/zh-cn.mjs"
// @ts-expect-error no .d.ts
import en from "element-plus/dist/locale/en.mjs"
import GithubIcon from "@/icons/github-icon.vue"

const isDark = useDark()
const locale = ref(en)
useTheme({
	onChanged: (theme) => {
		isDark.value = theme === ThemeModeType.DARK
	},
})
const setLocale = (lang: "zh" | "en") => {
	i18n.global.locale.value = lang
	switch (lang) {
	case "zh":
		locale.value = zhCn
		break
	case "en":
		locale.value = en
		break
	}
}
bitable.bridge.getLanguage().then((lang) => {
	["zh", "zh-TW", "zh-HK"].includes(lang)
		? setLocale("zh")
		: setLocale("en")
})
</script>
<template>
	<el-config-provider
		:locale="locale"
		:auto-insert-space="true"
	>
		<el-container>
			<el-header style="padding: 0;height: 20px;margin-bottom: 5px;">
				<el-row justify="space-between">
					<el-link
						href="https://dkywk0xucr.feishu.cn/docx/UZJ6dxKPCoeOJAxBqfacu0UVnad?from=from_copylink"
						target="_blank"
					>
						<el-icon>
							<Link />
						</el-icon>
						{{ $t("usageGuide") }}
					</el-link>
					<span>
						<el-tooltip>
							<template #content>
								<span>{{ $t("tooltip.questions") }}</span>
							</template>
							<el-link
								target="_blank"
								href="https://dkywk0xucr.feishu.cn/docx/UZJ6dxKPCoeOJAxBqfacu0UVnad#F1FHdAK9WoYl8dxyCSScG6VWndg"
							>
								<el-icon><QuestionFilled /></el-icon>
							</el-link>
						</el-tooltip>
						<el-tooltip>
							<template #content>
								<span>Github</span>
							</template>
							<el-link
								target="_blank"
								href="https://github.com/497363983/BaseTableManager"
							>
								<el-icon><GithubIcon /></el-icon>
							</el-link>
						</el-tooltip>
						<el-tooltip>
							<template #content>
								<span>{{ $t("tooltip.about") }}</span>
							</template>
							<span>
								<Info />
							</span>
						</el-tooltip>
					</span>
				</el-row>
			</el-header>
			<el-main style="padding: 0;">
				<tableTree />
			</el-main>
		</el-container>
	</el-config-provider>
</template>
