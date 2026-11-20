<template>
    <svg
        ref="worldMapRef"
        :aria-busy="mapLoading"
        aria-label="World map. Use arrow keys to choose a country, Enter or Space to open its details, and Tab or Shift+Tab to leave the map."
        class="az-world-map"
        preserveAspectRatio="xMidYMin meet"
        role="group"
        tabindex="-1"
        :class="{
            'az-world-map--zoomed': zoom > 1
        }"
        :height="viewHeight"
        :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
        :width="viewWidth"
        @keydown="onMapKeyDown"
        @pointercancel="endDrag"
        @pointerdown="startDrag"
        @pointerleave="onMapLeave"
        @pointermove="onMapMove"
        @pointerup="endDrag"
    >
        <foreignObject
            v-if="mapLoading"
            :height="viewHeight"
            :width="viewWidth"
        >
            <div class="az-world-map__loader">
                <BlockLoaderDots />
            </div>
        </foreignObject>

        <g
            :transform="`
                translate(${offsetX}, ${offsetY})
                scale(${mapScale})
            `"
        >
            <path
                v-for="country in countries"
                :key="country.name"
                :aria-label="country.name"
                class="az-world-map__country"
                role="button"
                :class="{
                    'az-world-map__country--highlighted':
                        country.name === highlightedCountry
                }"
                :d="country.path"
                :tabindex="country.name === tabbableCountryName ? 0 : -1"
                vector-effect="non-scaling-stroke"
                @blur="onCountryBlur"
                @click="selectCountry(country)"
                @focus="onCountryFocus(country, $event)"
                @keydown.enter.prevent="emit('country-click', country)"
                @keydown.space.prevent="emit('country-click', country)"
                @mouseenter="onCountryHover(country, $event)"
                @mouseleave="onCountryLeave"
            />
        </g>
    </svg>

    <teleport to="body">
        <div
            v-if="tooltip.visible"
            ref="tooltipRef"
            class="az-world-map__tooltip"
            :style="{
                left: `${tooltip.x}px`,
                maxHeight: `${tooltip.maxHeight}px`,
                maxWidth: `${tooltip.maxWidth}px`,
                top: `${tooltip.y}px`
            }"
        >
            {{ tooltip.name }}
        </div>
    </teleport>
</template>

<script lang="ts" setup>
import { useMapControls } from '@/composables/useMapControls'

import BlockLoaderDots from '@/components/BlockLoaderDots.vue'

import type { Country, MapMoveDirection, MapZoom } from '@/types/worldMap'

const props = defineProps<{
    focusedCountry?: string | null
    height: number
    highlightedCountry?: string | null
    zoom: MapZoom
}>()

const emit = defineEmits<{
    (event: 'country-click', country: Country): void
    (event: 'country-focus', countryName: string): void
    (event: 'map-ready-change', ready: boolean): void
    (event: 'move-availability-change', availability: Record<MapMoveDirection, boolean>): void
}>()

const {
    countries,
    mapLoading,
    mapScale,
    offsetX,
    offsetY,
    tabbableCountryName,
    tooltip,
    tooltipRef,
    viewHeight,
    viewWidth,
    worldMapRef,
    endDrag,
    onCountryBlur,
    onCountryFocus,
    onCountryHover,
    onCountryLeave,
    onMapKeyDown,
    onMapLeave,
    onMapMove,
    moveMap,
    selectCountry,
    startDrag
} = useMapControls(props, emit)

defineExpose({
    moveMap
})
</script>

<style lang="scss" scoped>
.az-world-map {
    width: calc(100% + 72px);
    max-width: none;
    height: var(--map-viewport-height, 580px);
    margin: 76px -36px -24px;
    display: block;
    flex-shrink: 0;
    cursor: grab;
    touch-action: none;

    &__loader {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    &:focus {
        box-shadow: none;
        outline: none;
    }

    @media (max-width: 767px) {
        width: calc(100% + 48px);
        margin-inline: -24px;
    }

    &:active {
        cursor: grabbing;
    }

    &--zoomed {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
    }

    &__country {
        fill: $color-milk-200;
        stroke: $color-milk-600;
        stroke-width: 1;
        cursor: pointer;
        transition: fill .15s ease;

        &:focus {
            outline: none;
        }

        &:focus-visible {
            stroke: $color-grey-300;
            stroke-width: 2;
        }

        &--highlighted {
            fill: $color-rose-100;
        }

        &:hover {
            fill: $color-mint-100;
        }
    }

    &__tooltip {
        position: fixed;
        overflow: hidden;
        max-width: calc(100vw - 8px);
        padding: 4px 8px;
        background: $color-grey-300;
        box-shadow: 0 4px 8px rgba($color-grey-300, .5);
        border-radius: 4px;
        pointer-events: none;
        font-size: 13px;
        color: $color-milk-200;
        white-space: normal;
        overflow-wrap: anywhere;
    }
}
</style>