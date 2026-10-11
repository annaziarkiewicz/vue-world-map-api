<template>
    <BlockModal
        :model-value="modelValue"
        title="Country details"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <div class="az-result-details">
            <div class="az-result-details__start">
                <BlockCountryMap
                    :capital="details.capital"
                    :capital-coordinates="capitalCoordinates"
                    :capital-coordinates-loading="capitalCoordinatesLoading"
                    :country="country"
                />
            </div>

            <div class="az-result-details__end">
                <div class="az-result-details__continent">
                    <template v-if="continent">
                        Continent: {{ continent }}
                    </template>
                </div>

                <h2 class="az-result-details__title">
                    {{ country.name }}
                </h2>

                <div
                    ref="detailsRef"
                    aria-label="Country details"
                    class="az-result-details__description"
                    role="region"
                    :tabindex="isScrollable ? 0 : undefined"
                >
                    <div
                        ref="contentRef"
                        class="az-result-details__content"
                    >
                        <div
                            v-if="loading"
                            class="az-result-details__loader"
                        >
                            <BlockLoaderDots />
                        </div>

                        <BlockError
                            v-else-if="error"
                            :message="error"
                        />

                        <template v-else>
                            <BlockDetails :details="details" />

                            <div class="az-result-details__charts">
                                <BlockChart
                                    :country-name="country.name"
                                    indicator="SP.POP.TOTL"
                                    title="Population"
                                />

                                <BlockChart
                                    :country-name="country.name"
                                    indicator="SP.DYN.LE00.IN"
                                    title="Life expectancy"
                                />
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </BlockModal>
</template>

<script lang="ts" setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch
} from 'vue'

import BlockChart from '@/components/BlockChart.vue'
import BlockCountryMap from '@/components/BlockCountryMap.vue'
import BlockDetails from '@/components/BlockDetails.vue'
import BlockError from '@/components/BlockError.vue'
import BlockLoaderDots from '@/components/BlockLoaderDots.vue'
import BlockModal from '@/components/BlockModal.vue'

import type {
    Country,
    CountryCapitalCoordinates,
    CountryDetails
} from '@/types/worldMap'

const props = defineProps<{
    capitalCoordinates: CountryCapitalCoordinates | null
    capitalCoordinatesLoading: boolean
    country: Country
    details: CountryDetails
    error: string | null
    loading: boolean
    modelValue: boolean
}>()

const emit = defineEmits<{
    (event: 'update:modelValue', value: boolean): void
}>()

const contentRef = ref<HTMLElement | null>(null)
const detailsRef = ref<HTMLElement | null>(null)
const isScrollable = ref(false)

let resizeObserver: ResizeObserver | null = null

const continent = computed(() => {
    if (props.details.region !== 'Americas') {
        return props.details.region
    }

    return props.details.subregion === 'South America'
        ? 'South America'
        : 'North America'
})

const updateScrollable = () => {
    if (!detailsRef.value || window.innerWidth <= 767) {
        isScrollable.value = false
        return
    }

    isScrollable.value = detailsRef.value.scrollHeight > detailsRef.value.clientHeight
}

watch(
    () => [
        props.details,
        props.error,
        props.loading,
        props.modelValue
    ],
    async () => {
        await nextTick()
        updateScrollable()
    }
)

onMounted(async () => {
    await nextTick()
    updateScrollable()
    window.addEventListener('resize', updateScrollable)

    resizeObserver = new ResizeObserver(updateScrollable)

    if (detailsRef.value) {
        resizeObserver.observe(detailsRef.value)
    }

    if (contentRef.value) {
        resizeObserver.observe(contentRef.value)
    }
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateScrollable)
    resizeObserver?.disconnect()
})
</script>

<style lang="scss" scoped>
.az-result-details {
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 36px;
    display: flex;
    gap: 48px;

    @media (max-width: 767px) {
        height: auto;
        padding: 24px;
        flex-direction: column;
        gap: 0;
    }

    &__start {
        width: 320px;
        height: 100%;
        min-height: 0;
        display: flex;
        flex-shrink: 0;
        justify-content: center;
        align-items: flex-start;

        @media (max-width: 767px) {
            width: 100%;
            height: auto;
            margin-block-end: 24px;
            order: 3;
        }
    }

    &__end {
        min-width: 0;
        min-height: 0;
        display: flex;
        flex: 1;
        flex-direction: column;

        @media (max-width: 767px) {
            display: contents;
        }
    }

    &__continent {
        min-height: 12px;
        font-size: 12px;
        line-height: 1em;
        color: $color-milk-500;
        text-transform: uppercase;

        @media (max-width: 767px) {
            order: 1;
        }
    }

    &__title {
        margin-block-end: 12px;
        font-size: 36px;
        line-height: 1.25em;
        color: $color-milk-100;
        text-transform: uppercase;
        overflow-wrap: anywhere;

        &:before {
            content: '';
            width: 38px;
            height: 26px;
            float: right;

            @media (max-width: 767px) {
                width: 44px;
                height: 32px;
            }
        }

        @media (max-width: 767px) {
            order: 2;
        }

        @media (max-width: 480px) {
            font-size: 24px;
        }
    }

    &__description {
        overflow-y: auto;
        min-height: 0;
        padding-block: 8px 4px;
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 24px;

        &[tabindex='0']:focus-visible {
            @include focus-ring($color-grey-400, 4px);
        }

        &::-webkit-scrollbar {
            width: 8px;
        }

        &::-webkit-scrollbar-track {
            background: $color-grey-200;
            border-radius: 4px;
        }

        &::-webkit-scrollbar-thumb {
            background: $color-milk-200;
            border-radius: 4px;
        }

        @media (max-width: 767px) {
            overflow: visible;
            flex: none;
            order: 4;
        }
    }

    &__content {
        width: 100%;
        padding-inline-end: 12px;
        display: flex;
        flex-direction: column;
        gap: 24px;

        @media (max-width: 767px) {
            padding: 0;
        }
    }

    &__loader {
        width: 100%;
        display: flex;
        justify-content: center;
    }

    &__charts {
        display: flex;
        gap: 24px;

        @media (max-width: 480px) {
            flex-direction: column;
        }
    }
}
</style>