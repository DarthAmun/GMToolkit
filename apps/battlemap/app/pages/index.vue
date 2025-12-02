<template>
    <div class="flex flex-col gap-2">
        <div class=" w-full h-14 flex gap-2  p-4 shadow-md rounded bg-[var(--p-card-background)]">
            <v-icon name="gi-axe-sword" />Battlemap
        </div>
        <div class=" flex gap-2  p-4">
            <Card v-for="map in maps">
                <template #header>
                    <div class="w-full h-24 overflow-hidden rounded-t">
                        <img :src="map.imageUrl" alt="map header" class="w-full h-full object-cover object-top" />
                    </div>
                </template>
                <template #title>{{ map.name }}</template>
                <template #content>
                    <div class="flex flex-col gap-2">
                        <Tag>Tokens: {{ map.mapTokens?.lenght ?? 0 }}</Tag>
                        <Tag>Created at: {{ formatDate(map.createdAt) }}</Tag>
                        <Tag>Last updated: {{ formatDate(map.updatedAt) }}</Tag>
                    </div>
                    <NuxtLink :to="`/map/${map.id}`"><v-icon name="gi-axe-sword" />Join</NuxtLink>
                </template>
            </Card>
        </div>
    </div>
</template>

<script setup lang="ts">
const maps = ref([]);
const { $api } = useNuxtApp();

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date);
};

onMounted(async () => {
    try {
        maps.value = await $api('/maps'); // fetch all maps
    } catch (err) {
        console.error('Failed to load maps', err);
    }
});
</script>

<style></style>
