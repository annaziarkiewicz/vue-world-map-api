<template>
    <div class="az-map-controls">
        <div class="az-map-controls__move">
            <button
                v-for="direction in moveDirections"
                :key="direction.value"
                :aria-label="direction.label"
                class="az-map-controls__move-button"
                :class="`az-map-controls__move-button--${direction.value}`"
                :disabled="!props.moveAvailable[direction.value]"
                type="button"
                @click="emit('move', direction.value)"
            >
                <svg
                    aria-hidden="true"
                    class="az-map-controls__move-icon"
                    :class="`az-map-controls__move-icon--${direction.value}`"
                    focusable="false"
                    viewBox="0 0 12 12"
                >
                    <path d="M6 1L11 11H1Z" />
                </svg>
            </button>
        </div>

        <div class="az-map-controls__drag">
            <img
                class="az-map-controls__drag-icon"
                :src="dragIcon"
                alt=""
            >

            <span class="az-map-controls__drag-label">
                Drag to move
            </span>
        </div>

        <div class="az-map-controls__zoom">
            <button
                v-for="value in zoomValues"
                :key="value"
                class="az-map-controls__zoom-button"
                :class="{
                    'az-map-controls__zoom-button--active':
                        modelValue === value
                }"
                :aria-label="`Zoom level ${value}`"
                :aria-pressed="modelValue === value"
                :disabled="modelValue === value"
                type="button"
                @click="emit('update:modelValue', value)"
            >
                ×{{ value }}
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import dragIcon from '@/assets/drag.svg'

import type { MapMoveDirection, MapZoom } from '@/types/worldMap'

const props = withDefaults(defineProps<{
    modelValue: MapZoom
    moveAvailable?: Record<MapMoveDirection, boolean>
}>(), {
    moveAvailable: () => ({ down: false, left: false, right: false, up: false })
})

const emit = defineEmits<{
    (event: 'move', direction: MapMoveDirection): void
    (event: 'update:modelValue', value: MapZoom): void
}>()

const zoomValues: MapZoom[] = [1, 2, 4]
const moveDirections: { label: string, value: MapMoveDirection }[] = [
    { label: 'Move map up', value: 'up' },
    { label: 'Move map left', value: 'left' },
    { label: 'Move map down', value: 'down' },
    { label: 'Move map right', value: 'right' }
]
</script>

<style lang="scss" scoped>
.az-map-controls {
    position: absolute;
    bottom: 8px;
    left: 36px;
    right: 36px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: end;
    gap: 12px;
    pointer-events: none;

    @media (max-width: 767px) {
        bottom: 16px;
        left: 24px;
        right: 24px;
    }

    &__drag {
        display: flex;
        grid-column: 1 / -1;
        grid-row: 1;
        align-items: center;
        gap: 4px;
        justify-self: center;

        @media (max-width: 767px) {
            margin-block-end: 52px;
            justify-self: end;
        }

        @media (max-width: 360px) {
            display: none;
        }

        &-icon {
            width: 36px;
            height: 36px;
            margin-inline-start: -7px;
            display: block;
            flex-shrink: 0;
            object-fit: contain;
        }

        &-label {
            font-size: 20px;
            font-weight: 300;
            line-height: 1em;
            color: $color-sand-400;
            text-shadow: 1px 1px $color-milk-400;
        }
    }

    &__move {
        display: grid;
        grid-column: 1;
        grid-row: 1;
        grid-template-columns: repeat(3, 44px);
        gap: 8px;
        pointer-events: none;
        justify-self: start;

        &-button {
            width: 44px;
            height: 44px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: $color-milk-600;
            border-radius: 12px;
            cursor: pointer;
            pointer-events: auto;
            font-size: 20px;
            line-height: 1em;
            color: $color-milk-200;

            &:focus-visible {
                box-shadow: 0 0 0 4px $color-grey-300;
            }

            &:hover:not(:disabled) {
                background: $color-mint-200;
                color: $color-milk-100;
            }

            &:disabled {
                background: $color-milk-400;
                cursor: not-allowed;
                color: $color-sand-300;
            }

            &--up {
                grid-column: 2;
                grid-row: 1;
            }

            &--left {
                grid-column: 1;
                grid-row: 2;
            }

            &--down {
                grid-column: 2;
                grid-row: 2;
            }

            &--right {
                grid-column: 3;
                grid-row: 2;
            }
        }

        &-icon {
            width: 12px;
            height: 12px;
            display: block;
            fill: currentColor;

            &--left {
                transform: rotate(-90deg);
            }

            &--down {
                transform: rotate(180deg);
            }

            &--right {
                transform: rotate(90deg);
            }
        }
    }

    &__zoom {
        display: flex;
        grid-column: 2;
        grid-row: 1;
        gap: 8px;
        pointer-events: auto;
        justify-self: end;

        @media (max-width: 360px) {
            flex-direction: column;
        }

        &-button {
            width: 44px;
            height: 44px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: $color-milk-600;
            border-radius: 12px;
            font-size: 20px;
            line-height: 1em;
            color: $color-milk-200;

            &:not(:disabled) {
                cursor: pointer;

                &:focus-visible {
                    box-shadow: 0 0 0 4px $color-grey-300;
                }

                &:hover {
                    background: $color-mint-200;
                    color: $color-milk-100;
                }
            }

            &--active {
                background: $color-milk-200;
                box-shadow: 0 0 0 .5px $color-milk-500;
                cursor: default;
                color: $color-sand-400;
            }
        }
    }
}
</style>