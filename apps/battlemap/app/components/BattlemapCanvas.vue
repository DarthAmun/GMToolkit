<script setup lang="ts">
import { Application, Assets, Container, Graphics, Sprite } from "pixi.js";
import { ref, onMounted } from "vue";

const { $pixi } = useNuxtApp();

const containerRef = ref<HTMLDivElement | null>(null);
const tokenUrl = ref('');
const mapUrl = ref('');
const draggingSprite = ref();

const gridSize = ref(50); // in pixels, adjustable

let app: any = new Application();
const mapContainer = new Container();
const gridContainer = new Container();

let mapSprite: Sprite;
const tokens: Sprite[] = []; // store all tokens

let draggingMap = false; // map dragging state

let draggedToken: Sprite | null = null;
let offsetX = 0;
let offsetY = 0;

// Pan variables
let dragging = false;
let dragStart = { x: 0, y: 0 };
let mapStart = { x: 0, y: 0 };

// Zoom variables
let scale = 1;
const minScale = 0.1;
const maxScale = 3;

onMounted(async () => {
    // Initialize Pixi application
    await app.init({
        resizeTo: containerRef.value!,
        background: "#1e1e1e",
        antialias: true,
    });

    // Append canvas
    containerRef.value!.appendChild(app.canvas);

    // ... set up world container, grid, pan/zoom, etc.
    app.stage.addChild(mapContainer);

    // --- Pan ---
    app.stage.interactive = true;
    // --- Stage pointerdown ---
    app.stage.on('pointerdown', (event: any) => {
        const target = event.target; // PIXI object under cursor

        if (tokens.includes(target)) {
            // Start dragging token
            draggedToken = target as Sprite;
            const pos = event.data.getLocalPosition(draggedToken.parent);
            offsetX = pos.x - draggedToken.x;
            offsetY = pos.y - draggedToken.y;
        } else {
            // Start dragging map
            draggingMap = true;
            dragStart.x = event.data.global.x;
            dragStart.y = event.data.global.y;
            mapStart.x = mapContainer.x;
            mapStart.y = mapContainer.y;
        }
    });

    // --- Stage pointermove ---
    app.stage.on('pointermove', (event: any) => {
        if (draggedToken) {
            const pos = event.data.getLocalPosition(draggedToken.parent);
            draggedToken.x = pos.x - offsetX;
            draggedToken.y = pos.y - offsetY;
        } else if (draggingMap) {
            const dx = event.data.global.x - dragStart.x;
            const dy = event.data.global.y - dragStart.y;
            mapContainer.x = mapStart.x + dx;
            mapContainer.y = mapStart.y + dy;
        }
    });

    // --- Stage pointerup / pointerupoutside ---
    const stopDrag = () => {
        if (draggedToken) {
            draggedToken.x = Math.round(draggedToken.x / gridSize.value) * gridSize.value;
            draggedToken.y = Math.round(draggedToken.y / gridSize.value) * gridSize.value;
            draggedToken = null;
        }
        draggingMap = false;
    };

    app.stage.on('pointerup', stopDrag);
    app.stage.on('pointerupoutside', stopDrag);

    // --- Zoom ---
    containerRef.value!.addEventListener('wheel', (e: WheelEvent) => {
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
});

const addMap = async () => {
    const texture = await Assets.load(mapUrl.value);
    mapSprite = new Sprite(texture);
    mapContainer.addChildAt(mapSprite, 0); // behind grid
    mapContainer.addChildAt(gridContainer, 1);

    drawGrid();
}

const addToken = async () => {
    const texture = await Assets.load(tokenUrl.value);
    const token = new Sprite(texture);

    token.width = gridSize.value;
    token.height = gridSize.value;

    // Snap to grid at (0,0) initially
    token.x = 0;
    token.y = 0;

    token.interactive = true;
    token.cursor = "pointer"; // show pointer cursor on hover

    let offsetX = 0;
    let offsetY = 0;

    token.on('pointerdown', (event: any) => {
        const pos = event.data.getLocalPosition(token.parent);
        offsetX = pos.x - token.x;
        offsetY = pos.y - token.y;
        draggedToken = token; // start dragging
        draggingSprite.value = true; // optional, if you use this flag
    });

    token.on('pointermove', (event: any) => {
        if (!draggingSprite.value) return;
        const pos = event.data.getLocalPosition(token.parent);
        token.x = pos.x - offsetX;
        token.y = pos.y - offsetY;
    });

    token.on('pointerup', () => {
        draggingSprite.value = false;
        token.x = Math.round(token.x / gridSize.value) * gridSize.value;
        token.y = Math.round(token.y / gridSize.value) * gridSize.value;
    });

    token.on('pointerupoutside', () => {
        draggingSprite.value = false;
        token.x = Math.round(token.x / gridSize.value) * gridSize.value;
        token.y = Math.round(token.y / gridSize.value) * gridSize.value;
    });

    tokens.push(token); // store token
    mapContainer.addChildAt(token, 2);
}

const drawGrid = () => {
    if (!mapSprite) return; // no map yet

    gridContainer.removeChildren();

    const g = new Graphics();
    g.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.3 });

    const mapWidth = mapSprite.width;
    const mapHeight = mapSprite.height;
    const step = gridSize.value;

    // Vertical lines
    for (let x = 0; x <= mapWidth; x += step) {
        g.moveTo(x, 0);
        g.lineTo(x, mapHeight);
    }

    // Horizontal lines
    for (let y = 0; y <= mapHeight; y += step) {
        g.moveTo(0, y);
        g.lineTo(mapWidth, y);
    }

    g.stroke();

    gridContainer.addChild(g);
};

watch(gridSize, (newSize) => {
    drawGrid(); // redraw grid

    // resize all tokens to match new grid size
    tokens.forEach(token => {
        token.width = newSize;
        token.height = newSize;

        // optionally snap token to new grid
        token.x = Math.round(token.x / newSize) * newSize;
        token.y = Math.round(token.y / newSize) * newSize;
    });
});
</script>

<template>
    <input v-model="mapUrl" />
    <button @click="addMap">loadMap</button>
    <input v-model="tokenUrl" />
    <button @click="addToken">loadSprite</button>
    <input v-model="gridSize" type="number" />
    <div ref="containerRef" class="w-full h-full border rounded overflow-hidden"></div>
</template>

<style scoped>
div {
    width: 100%;
    height: 80vh;
    /* adjust as needed */
    overflow: hidden;
}
</style>
