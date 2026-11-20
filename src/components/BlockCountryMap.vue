<template>
    <div
        v-if="countryPath"
        ref="countryMapRef"
        :aria-busy="capitalCoordinatesLoading"
        class="az-country-map"
        :style="countryMapStyle"
    >
        <svg
            class="az-country-map__svg"
            :viewBox="shapeViewBox"
        >
            <path
                class="az-country-map__shape"
                :d="countryPath"
            />
        </svg>

        <div
            v-if="capitalMarker"
            class="az-country-map__capital"
            :style="{
                left: `${capitalMarker.x}%`,
                top: `${capitalMarker.y}%`
            }"
        >
            <span class="az-country-map__capital-dot" />

            <span class="az-country-map__capital-label">
                {{ capital }}
            </span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useWorldMap } from '@/composables/useWorldMap'

import type {
    Country,
    CountryCapitalCoordinates
} from '@/types/worldMap'

interface CapitalMarker {
    x: number
    y: number
}

interface ShapeBounds {
    height: number
    minX: number
    minY: number
    width: number
}

const props = defineProps<{
    capital: string
    capitalCoordinates: CountryCapitalCoordinates | null
    capitalCoordinatesLoading: boolean
    country: Country
}>()

const {
    buildProjectedShape,
    buildWorldMapProjector,
    getCountryByName,
    getMainCountryGeometry
} = useWorldMap()

const availableHeight = ref(0)
const availableWidth = ref(0)
const countryMapRef = ref<HTMLDivElement | null>(null)
const countryPath = ref<string | null>(null)
const shapeBounds = ref<ShapeBounds | null>(null)
const shapeViewBox = ref('0 0 100 100')
const projectCoordinates = buildWorldMapProjector(580)

let resizeObserver: ResizeObserver | null = null

const capitalMarker = computed<CapitalMarker | null>(() => {
    const bounds = shapeBounds.value
    const capitalCoordinates = props.capitalCoordinates

    if (!bounds || !capitalCoordinates) {
        return null
    }

    const [capitalX, capitalY] = projectCoordinates(
        capitalCoordinates.longitude,
        capitalCoordinates.latitude
    )

    const x =
        ((capitalX - bounds.minX) / bounds.width) * 100

    const y =
        ((capitalY - bounds.minY) / bounds.height) * 100

    if (
        x < 0
        || x > 100
        || y < 0
        || y > 100
    ) {
        return null
    }

    return {
        x,
        y
    }
})

const countryMapStyle = computed(() => {
    const bounds = shapeBounds.value

    if (
        !bounds
        || !availableWidth.value
    ) {
        return undefined
    }

    const shapeAspectRatio =
        bounds.width / bounds.height

    const width = availableHeight.value
        ? Math.min(
            availableWidth.value,
            availableHeight.value * shapeAspectRatio
        )
        : availableWidth.value

    return {
        height: `${width / shapeAspectRatio}px`,
        width: `${width}px`
    }
})

const updateAvailableSize = () => {
    const container = countryMapRef.value?.parentElement

    if (!container) {
        return
    }

    availableHeight.value = window.innerWidth > 767
        ? container.clientHeight
        : 0
    availableWidth.value = container.clientWidth
}

const loadCountryShape = () => {
    const country = getCountryByName(props.country.name)

    if (!country) {
        countryPath.value = null
        shapeBounds.value = null
        return
    }

    const geometry = getMainCountryGeometry(
        country.geometry
    )

    const {
        d,
        viewBox
    } = buildProjectedShape(
        geometry,
        projectCoordinates
    )

    const [
        minX,
        minY,
        width,
        height
    ] = viewBox
        .split(' ')
        .map(Number)

    countryPath.value = d
    shapeViewBox.value = viewBox

    shapeBounds.value = {
        height,
        minX,
        minY,
        width
    }

    nextTick(updateAvailableSize)
}

onMounted(() => {
    const container = countryMapRef.value?.parentElement

    if (!container) {
        return
    }

    resizeObserver = new ResizeObserver(
        updateAvailableSize
    )

    resizeObserver.observe(container)
    updateAvailableSize()
})

onBeforeUnmount(() => {
    resizeObserver?.disconnect()
})

watch(
    () => props.country.name,
    loadCountryShape,
    {
        immediate: true
    }
)
</script>

<style lang="scss" scoped>
.az-country-map {
    position: relative;
    width: 100%;
    max-height: 100%;

    &__svg {
        width: 100%;
        height: 100%;
        max-height: 100%;
        display: block;
    }

    &__shape {
        fill: $color-milk-200;
    }

    &__capital {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
        transform: translate(-50%, -6px);

        &-dot {
            width: 8px;
            height: 8px;
            display: block;
            flex-shrink: 0;
            background: $color-rose-100;
            border-radius: 50%;
        }

        &-label {
            margin-block-start: 4px;
            padding: 4px 8px;
            background: $color-grey-300;
            box-shadow: 0 4px 8px rgba($color-grey-300, .5);
            border-radius: 4px;
            font-size: 13px;
            color: $color-milk-200;
            white-space: nowrap;
        }
    }
}
</style>