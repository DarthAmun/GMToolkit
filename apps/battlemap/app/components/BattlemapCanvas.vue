<script setup lang="ts">
import { Application, Assets, Container, Graphics, Sprite } from "pixi.js";
import { ref, onMounted, watch } from "vue";

const props = defineProps<{
    map: any;
}>();

interface DraggableSprite extends Sprite {
    offset?: { x: number; y: number };
    tokenId?: string;
}

const { $api } = useNuxtApp();

const containerRef = ref<HTMLDivElement | null>(null);

const gridSize = ref(50);
let app: any = new Application();

const mapContainer = new Container();
const gridContainer = new Container();
let mapSprite: Sprite | null = null;

const tokens: Sprite[] = [];
let draggedToken: DraggableSprite | null = null;

let draggingMap = false;
let dragStart = { x: 0, y: 0 };
let mapStart = { x: 0, y: 0 };

let scale = 1;
const minScale = 0.1;
const maxScale = 3;

/* --------------------------------------------
   LOAD MAP + PIXI SETUP
-------------------------------------------- */
onMounted(async () => {
    await app.init({
        resizeTo: containerRef.value!,
        background: "#1e1e1e",
        antialias: true,
    });

    containerRef.value!.appendChild(app.canvas);

    app.stage.addChild(mapContainer);

    // --- PAN ---
    app.stage.interactive = true;

    app.stage.on("pointerdown", (event: any) => {
        const target = event.target;

        if (tokens.includes(target)) {
            // drag token
            draggedToken = target;
            if (!draggedToken) return;

            const pos = event.data.getLocalPosition(draggedToken.parent);
            draggedToken.offset = {
                x: pos.x - draggedToken.x,
                y: pos.y - draggedToken.y,
            };
        } else {
            // drag map
            draggingMap = true;
            dragStart = { x: event.data.global.x, y: event.data.global.y };
            mapStart = { x: mapContainer.x, y: mapContainer.y };
        }
    });

    app.stage.on("pointermove", (event: any) => {
        if (draggedToken) {
            const pos = event.data.getLocalPosition(draggedToken.parent);
            draggedToken.x = pos.x - (draggedToken.offset?.x ?? 0);
            draggedToken.y = pos.y - (draggedToken.offset?.y ?? 0);
        } else if (draggingMap) {
            const dx = event.data.global.x - dragStart.x;
            const dy = event.data.global.y - dragStart.y;
            mapContainer.x = mapStart.x + dx;
            mapContainer.y = mapStart.y + dy;
        }
    });

    const stopDrag = async () => {
        if (draggedToken) {
            draggedToken.x = Math.round(draggedToken.x / gridSize.value) * gridSize.value;
            draggedToken.y = Math.round(draggedToken.y / gridSize.value) * gridSize.value;

            await updateBackendTokenPosition(draggedToken);
        }

        draggedToken = null;
        draggingMap = false;
    };

    app.stage.on("pointerup", stopDrag);
    app.stage.on("pointerupoutside", stopDrag);

    // --- ZOOM ---
    containerRef.value!.addEventListener("wheel", (e: WheelEvent) => {
        e.preventDefault();
        const oldScale = scale;

        scale *= e.deltaY < 0 ? 1.1 : 0.9;
        scale = Math.min(Math.max(scale, minScale), maxScale);

        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        const worldPos = {
            x: (mouseX - mapContainer.x) / oldScale,
            y: (mouseY - mapContainer.y) / oldScale,
        };

        mapContainer.x = mouseX - worldPos.x * scale;
        mapContainer.y = mouseY - worldPos.y * scale;
        mapContainer.scale.set(scale);
    });

    // ★ Load map from backend
    await loadMapImage();

    // ★ Load map tokens
    await loadBackendTokens();
});

/* --------------------------------------------
   LOAD MAP IMAGE FROM BACKEND
-------------------------------------------- */
const loadMapImage = async () => {
    if (!props.map?.imageUrl) return;

    const texture = await Assets.load(props.map.imageUrl);
    mapSprite = new Sprite(texture);

    mapContainer.addChildAt(mapSprite, 0);
    mapContainer.addChildAt(gridContainer, 1);

    drawGrid();
};

/* --------------------------------------------
   LOAD TOKENS FROM BACKEND
-------------------------------------------- */
const loadBackendTokens = async () => {
    if (!props.map?.tokens) return;

    for (const mt of props.map.tokens) {
        const texture = await Assets.load(mt.token.image);
        const sprite = new Sprite(texture);

        sprite.width = gridSize.value;
        sprite.height = gridSize.value;
        sprite.x = mt.x;
        sprite.y = mt.y;

        sprite.interactive = true;
        sprite.cursor = "pointer";

        (sprite as any).mapTokenId = mt.id;

        enableTokenDragging(sprite);

        tokens.push(sprite);
        mapContainer.addChild(sprite);
    }
};

/* --------------------------------------------
   DRAG TOKEN LOGIC
-------------------------------------------- */
const enableTokenDragging = (token: Sprite) => {
    token.on("pointerdown", (event: any) => {
        const pos = event.data.getLocalPosition(token.parent);
        draggedToken = token;
        draggedToken.offset = {
            x: pos.x - token.x,
            y: pos.y - token.y,
        };
    });

    token.on("pointerup", async () => {
        if (!draggedToken) return;

        draggedToken.x = Math.round(draggedToken.x / gridSize.value) * gridSize.value;
        draggedToken.y = Math.round(draggedToken.y / gridSize.value) * gridSize.value;

        await updateBackendTokenPosition(draggedToken);
        draggedToken = null;
    });

    token.on("pointerupoutside", () => (draggedToken = null));
};

/* --------------------------------------------
   UPDATE TOKEN POSITION IN BACKEND
-------------------------------------------- */
const updateBackendTokenPosition = async (token: Sprite) => {
    const mapTokenId = (token as any).mapTokenId;
    if (!mapTokenId) return;

    await $api(`/maps/token/${mapTokenId}`, {
        method: "PATCH",
        body: {
            x: token.x,
            y: token.y,
        },
    });
};

/* --------------------------------------------
   GRID
-------------------------------------------- */
const drawGrid = () => {
    if (!mapSprite) return;

    gridContainer.removeChildren();

    const g = new Graphics();
    g.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.3 });

    const w = mapSprite.width;
    const h = mapSprite.height;
    const step = gridSize.value;

    for (let x = 0; x <= w; x += step) {
        g.moveTo(x, 0);
        g.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
        g.moveTo(0, y);
        g.lineTo(w, y);
    }

    g.stroke();
    gridContainer.addChild(g);
};

watch(gridSize, () => {
    drawGrid();

    tokens.forEach((t) => {
        t.width = gridSize.value;
        t.height = gridSize.value;

        t.x = Math.round(t.x / gridSize.value) * gridSize.value;
        t.y = Math.round(t.y / gridSize.value) * gridSize.value;
    });
});
</script>

<template>
    <div class="relative">
        <div class="fixed top-0 left-0 flex gap-2 p-2 shadow-md bg-[#1d1f1d] rounded">
            <NuxtLink to="/"><v-icon name="gi-axe-sword" />Battlemap</NuxtLink>
        </div>
        <div class="fixed bottom-0 left-0 flex gap-2 p-2 shadow-md bg-[#1d1f1d] rounded">
            <input v-model="gridSize" type="number" />
        </div>
        <div ref="containerRef" class="w-[100vw] h-[100vh] rounded overflow-hidden"></div>
    </div>
</template>

<style scoped></style>
