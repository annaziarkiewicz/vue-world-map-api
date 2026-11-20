<template>
    <div v-if="items.length" class="az-details">
        <div class="az-details__list">
            <h3 class="az-details__label">
                Details:
            </h3>

            <div
                v-for="item in items"
                :key="item.label"
                class="az-details__item"
            >
                <span class="az-details__item-label">
                    {{ item.label }}:
                </span>

                <span class="az-details__item-value">
                    {{ item.value }}
                </span>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import type { CountryDetails } from '@/types/worldMap'

const props = defineProps<{
    details: CountryDetails
}>()

const items = computed(() => {
    return [
        {
            label: 'Capital',
            value: props.details.capital
        },
        {
            label: 'Subregion',
            value: props.details.subregion
        },
        {
            label: 'Population',
            value: props.details.population
        },
        {
            label: 'Area',
            value: props.details.area
        },
        {
            label: 'Languages',
            value: props.details.languages.join(', ')
        },
        {
            label: 'Currencies',
            value: props.details.currencies.join(', ')
        },
        {
            label: 'Time zones',
            value: props.details.timezones.join(', ')
        }
    ].filter((item) => item.value)
})
</script>

<style lang="scss" scoped>
.az-details {
    width: 100%;

    &__list {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    &__label {
        font-size: 12px;
        line-height: 1em;
        color: $color-sand-400;
        text-transform: uppercase;
    }

    &__item {
        font-size: 20px;
        line-height: 1.5em;
        overflow-wrap: anywhere;

        &-label {
            color: $color-milk-200;
        }

        &-value {
            color: $color-milk-100;
        }
    }
}
</style>