<template>
    <div class="az-chart">
        <h3 class="az-chart__label">
            {{ title }}:
        </h3>

        <div v-if="loading" class="az-chart__loading">
            <BlockLoaderRing :size="24" />
        </div>

        <BlockError v-else-if="error" :message="error" />

        <svg
            v-else-if="chartData.length"
            class="az-chart__svg"
            :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
            role="img"
            :aria-label="chartDescription"
        >
            <line
                v-for="line in horizontalLines"
                :key="line.y"
                class="az-chart__grid-line"
                :x1="paddingLeft"
                :x2="chartWidth - paddingRight"
                :y1="line.y"
                :y2="line.y"
            />

            <text
                v-for="line in horizontalLines"
                :key="`value-${line.y}`"
                class="az-chart__axis-label"
                :x="paddingLeft - 8"
                :y="line.y + 4"
                text-anchor="end"
            >
                {{ line.label }}
            </text>

            <path
                class="az-chart__line"
                :d="chartPath"
            />

            <circle
                v-if="chartPoints.length === 1"
                class="az-chart__point"
                :cx="chartPoints[0].x"
                :cy="chartPoints[0].y"
                r="3"
            />

            <text
                v-for="label in yearLabels"
                :key="label.year"
                class="az-chart__axis-label"
                :x="label.x"
                :y="chartHeight - 2"
                text-anchor="middle"
            >
                {{ label.year }}
            </text>
        </svg>

    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import { useChart } from '@/composables/useChart'

import BlockError from '@/components/BlockError.vue'
import BlockLoaderRing from '@/components/BlockLoaderRing.vue'

import type { WorldBankIndicator } from '@/types/worldMap'

const props = defineProps<{
    countryName: string
    indicator: WorldBankIndicator
    title: string
}>()

const {
    chartData,
    chartHeight,
    chartPath,
    chartPoints,
    chartWidth,
    error,
    horizontalLines,
    loading,
    paddingLeft,
    paddingRight,
    yearLabels
} = useChart(
    () => props.countryName,
    () => props.indicator
)

const chartDescription = computed(() => {
    const values = chartData.value.map((item) => {
        const value = Intl.NumberFormat('en', {
            maximumFractionDigits: props.indicator === 'SP.POP.TOTL' ? 0 : 1
        }).format(item.value)
        const unit = props.indicator === 'SP.POP.TOTL' ? 'people' : 'years'

        return `${item.year}: ${value} ${unit}`
    }).join('; ')

    return `${props.title} for ${props.countryName}. ${values}.`
})
</script>

<style lang="scss" scoped>
.az-chart {
    min-width: 0;
    flex: 1;

    &__label {
        margin-block-end: 12px;
        font-size: 12px;
        line-height: 1em;
        color: $color-milk-500;
        text-transform: uppercase;
    }

    &__loading {
        width: 100%;
        height: 124px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: $color-milk-300;
    }

    &__svg {
        overflow: visible;
        width: 100%;
        height: 124px;
        display: block;
    }

    &__grid-line {
        stroke: $color-milk-400;
        stroke-width: .5;
    }

    &__axis-label {
        font-size: 12px;
        fill: $color-grey-300;
    }

    &__point {
        fill: $color-milk-200;
    }

    &__line {
        fill: none;
        stroke: $color-milk-200;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
}
</style>