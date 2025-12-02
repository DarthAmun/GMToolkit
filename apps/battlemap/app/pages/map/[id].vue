<template>
    <BattlemapCanvas :map="map" />
</template>

<script setup>
const route = useRoute();
const { $api } = useNuxtApp();

const map = ref(null);

// Fetch map + tokens
await onMounted(async () => {
    map.value = await $api(`/maps/${route.params.id}`);
});
</script>

<style></style>
