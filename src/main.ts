import { createApp } from "vue"
import App from "./App.vue"
import { i18n } from "./i18n"
import "element-plus/dist/index.css"
import "element-plus/theme-chalk/dark/css-vars.css"

const app = createApp(App)
app.use(i18n).mount("#app")