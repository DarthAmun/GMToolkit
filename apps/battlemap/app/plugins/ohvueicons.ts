import { addIcons, OhVueIcon } from "oh-vue-icons";
import { GiAxeSword } from "oh-vue-icons/icons";

addIcons(GiAxeSword);

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component("v-icon", OhVueIcon);
});
