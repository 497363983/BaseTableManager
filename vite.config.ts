/// <reference types="vitest" />

import { defineConfig } from "vite"
import path from "path"

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		include: ["test/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
	},
})
