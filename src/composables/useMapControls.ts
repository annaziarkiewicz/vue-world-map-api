import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import { useTooltip } from '@/composables/useTooltip'
import { useWorldMap } from '@/composables/useWorldMap'

import type { Country, CountryGeometry, MapMoveDirection, MapZoom } from '@/types/worldMap'

interface CountryBounds {
    maxX: number
    maxY: number
    minX: number
    minY: number
}

interface ProjectedShape {
    bounds: CountryBounds
    path: string
}

interface RenderedCountry extends Country {
    focusX: number
    focusY: number
}

interface WorldMapContent {
    contentMaxY: number
    contentMinY: number
    countries: RenderedCountry[]
    initialOffsetX: number
    initialOffsetY: number
}

interface WorldMapProps {
    focusedCountry?: string | null
    height: number
    highlightedCountry?: string | null
    zoom: MapZoom
}

interface WorldMapEmit {
    (event: 'country-click', country: Country): void
    (event: 'country-focus', countryName: string): void
    (event: 'map-ready-change', ready: boolean): void
    (event: 'move-availability-change', availability: Record<MapMoveDirection, boolean>): void
}

export const useMapControls = (props: WorldMapProps, emit: WorldMapEmit) => {
    const appHeight = 680
    const moveStep = 48
    const searchBottom = 100
    const desktopViewWidth = 960
    const mobileViewHeight = 480
    const worldHeight = props.height
    const worldWidth = worldHeight * 2

    const {
        countriesError,
        buildProjectedShape,
        buildWorldMapProjector,
        getAllCountries,
        getMainCountryGeometry,
        loadCountries
    } = useWorldMap()

    const projectCoordinates = buildWorldMapProjector(worldHeight)

    let contentMaxY = 0
    let contentMinY = 0
    let suppressClick = false
    let activePointerId: number | null = null
    let resizeObserver: ResizeObserver | null = null
    let viewportResizeFrame: number | null = null
    let mapMounted = true
    let dragging = false
    let dragStartX = 0
    let dragStartY = 0
    let initialOffsetY = 0
    let startOffsetX = 0
    let startOffsetY = 0

    const mapReady = ref(false)
    const mapLoading = computed(() => !mapReady.value && !countriesError.value)
    const countries = shallowRef<RenderedCountry[]>([])
    const worldMapRef = ref<SVGSVGElement | null>(null)
    const {
        tooltip,
        tooltipRef,
        clearHoveredTooltip,
        hideTooltip,
        onCountryBlur,
        onCountryHover,
        onCountryLeave,
        onTooltipMove,
        setFocusedTooltip,
        updateTooltipPosition
    } = useTooltip(worldMapRef)

    const compactViewport = ref(false)
    const contentHeight = ref(worldHeight)
    const baseViewHeight = ref(worldHeight)
    const viewportScale = ref(1)
    const viewWidth = ref(desktopViewWidth)
    const zoomedViewHeight = ref(appHeight)
    const offsetX = ref(0)
    const offsetY = ref(0)


    const getViewHeight = (zoom = props.zoom) => {
        return zoom === 1 ? baseViewHeight.value : zoomedViewHeight.value
    }

    const getMapScale = (zoom = props.zoom) => {
        const baseScale = compactViewport.value
            ? (baseViewHeight.value - 2) / contentHeight.value
            : 1

        return baseScale * zoom
    }

    const mapScale = computed(() => getMapScale())
    const tabbableCountryName = computed(() => {
        return getRenderedCountry(props.focusedCountry ?? '')?.name
            ?? countries.value[0]?.name
            ?? null
    })
    const viewHeight = computed(() => getViewHeight())

    const createProjectedShape = (geometry: CountryGeometry): ProjectedShape => {
        const { d, viewBox } = buildProjectedShape(geometry, projectCoordinates)
        const [minX, minY, width, height] = viewBox.split(' ').map(Number)

        return {
            bounds: {
                maxX: minX + width,
                maxY: minY + height,
                minX,
                minY
            },
            path: d
        }
    }

    const createWorldMapContent = (): WorldMapContent => {
        let contentMaxX = -Infinity
        let contentMaxY = -Infinity
        let contentMinX = Infinity
        let contentMinY = Infinity

        const countries = getAllCountries().map((country) => {
            const countryShape = createProjectedShape(country.geometry)
            const mainCountryShape = createProjectedShape(getMainCountryGeometry(country.geometry))

            contentMaxX = Math.max(contentMaxX, countryShape.bounds.maxX)
            contentMaxY = Math.max(contentMaxY, countryShape.bounds.maxY)
            contentMinX = Math.min(contentMinX, countryShape.bounds.minX)
            contentMinY = Math.min(contentMinY, countryShape.bounds.minY)

            return {
                focusX: (mainCountryShape.bounds.minX + mainCountryShape.bounds.maxX) / 2,
                focusY: (mainCountryShape.bounds.minY + mainCountryShape.bounds.maxY) / 2,
                id: country.properties.ISO_A2,
                name: country.properties.ADMIN,
                path: countryShape.path
            }
        })

        return {
            contentMaxY,
            contentMinY,
            countries,
            initialOffsetX:
                (viewWidth.value - (contentMaxX - contentMinX))
                / 2
                - contentMinX,
            initialOffsetY:
                (
                    props.height
                    - (contentMaxY - contentMinY)
                )
                / 2
                - contentMinY
                + 10
        }
    }

    const initializeWorldMap = () => {
        const worldMapContent = createWorldMapContent()

        contentMaxY = worldMapContent.contentMaxY
        contentMinY = worldMapContent.contentMinY
        contentHeight.value = contentMaxY - contentMinY
        countries.value = worldMapContent.countries
        initialOffsetY = worldMapContent.initialOffsetY
        offsetX.value = clampOffsetX(
            viewWidth.value / 2
            - (viewWidth.value / 2 - worldMapContent.initialOffsetX) * getMapScale()
        )
        offsetY.value = worldMapContent.initialOffsetY
    }

    const clampOffsetX = (
        value: number,
        zoom = props.zoom
    ) => {
        const minOffsetX = viewWidth.value - worldWidth * getMapScale(zoom)

        return Math.min(0, Math.max(minOffsetX, value))
    }

    const clampOffsetY = (
        value: number,
        zoom = props.zoom
    ) => {
        if (zoom === 1 && !compactViewport.value) {
            return initialOffsetY
        }

        const scale = getMapScale(zoom)

        if (zoom === 1) {
            return (getViewHeight(zoom) - contentHeight.value * scale) / 2 - contentMinY * scale
        }

        const minOffsetY =
            getViewHeight(zoom)
            - contentMaxY * scale

        const maxOffsetY =
            searchBottom / viewportScale.value
            - contentMinY * scale

        return Math.min(
            maxOffsetY,
            Math.max(minOffsetY, value)
        )
    }

    const moveAvailable = computed<Record<MapMoveDirection, boolean>>(() => {
        if (!countries.value.length) {
            return { down: false, left: false, right: false, up: false }
        }

        return {
            down: props.zoom > 1 && clampOffsetY(offsetY.value - moveStep) < offsetY.value - .001,
            left: clampOffsetX(offsetX.value + moveStep) > offsetX.value + .001,
            right: clampOffsetX(offsetX.value - moveStep) < offsetX.value - .001,
            up: props.zoom > 1 && clampOffsetY(offsetY.value + moveStep) > offsetY.value + .001
        }
    })

    const updateViewportSize = () => {
        const mapBounds = worldMapRef.value?.getBoundingClientRect()
        const appBounds = worldMapRef.value?.parentElement?.getBoundingClientRect()

        if (!mapBounds || !appBounds || mapBounds.width <= 0 || appBounds.height <= 0) {
            return
        }

        const previousWidth = viewWidth.value
        const previousHeight = viewHeight.value
        const nextCompactViewport = window.innerWidth <= 767
        const nextWidth = nextCompactViewport ? mapBounds.width : desktopViewWidth
        const nextScale = mapBounds.width / nextWidth
        const nextBaseHeight = (nextCompactViewport ? mobileViewHeight : worldHeight) / nextScale
        const nextZoomedHeight = appBounds.height / nextScale

        if (
            previousWidth === nextWidth
            && compactViewport.value === nextCompactViewport
            && baseViewHeight.value === nextBaseHeight
            && zoomedViewHeight.value === nextZoomedHeight
        ) {
            return
        }

        const previousMapScale = getMapScale()
        const worldCenterX = (previousWidth / 2 - offsetX.value) / previousMapScale
        const worldCenterY = (previousHeight / 2 - offsetY.value) / previousMapScale

        compactViewport.value = nextCompactViewport
        baseViewHeight.value = nextBaseHeight
        viewportScale.value = nextScale
        viewWidth.value = nextWidth
        zoomedViewHeight.value = nextZoomedHeight

        if (countries.value.length) {
            offsetX.value = clampOffsetX(viewWidth.value / 2 - worldCenterX * getMapScale())
            offsetY.value = clampOffsetY(viewHeight.value / 2 - worldCenterY * getMapScale())
        }
    }

    const getRenderedCountry = (countryName: string) => {
        return countries.value.find((country) => {
            return country.name === countryName
        }) ?? null
    }

    const getCountryElement = (countryName: string) => {
        return Array.from(worldMapRef.value?.querySelectorAll<SVGPathElement>(
            '.az-world-map__country'
        ) ?? []).find((element) => element.getAttribute('aria-label') === countryName)
    }

    const focusCountry = (countryName = props.focusedCountry) => {
        if (!countryName) {
            return
        }

        const country = getRenderedCountry(countryName)

        if (!country) {
            return
        }

        offsetX.value = clampOffsetX(
            viewWidth.value / 2
            - country.focusX * getMapScale()
        )

        if (props.zoom === 1 && !compactViewport.value) {
            offsetY.value = initialOffsetY
            return
        }

        const visibleTop = props.zoom === 1 ? 0 : searchBottom / viewportScale.value
        const visibleHeight = viewHeight.value - visibleTop
        const targetY = visibleTop + visibleHeight / 2

        offsetY.value = clampOffsetY(
            targetY
            - country.focusY * getMapScale()
        )
    }

    const onViewportResize = () => {
        updateViewportSize()

        if (props.focusedCountry) {
            focusCountry()
        }

        updateTooltipPosition()
    }

    const onWindowResize = () => {
        if (viewportResizeFrame !== null) {
            cancelAnimationFrame(viewportResizeFrame)
        }

        viewportResizeFrame = requestAnimationFrame(() => {
            viewportResizeFrame = null
            onViewportResize()
        })
    }

    const startDrag = (event: PointerEvent) => {
        if (event.button !== 0) {
            return
        }

        activePointerId = event.pointerId
        suppressClick = false
        dragging = true
        dragStartX = event.clientX
        dragStartY = event.clientY
        startOffsetX = offsetX.value
        startOffsetY = offsetY.value
    }

    const onDrag = (event: MouseEvent) => {
        if (!dragging) {
            return
        }

        if (!(event.buttons & 1)) {
            endDrag()
            return
        }

        if (
            activePointerId !== null
            && Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) > 5
        ) {
            suppressClick = true
            worldMapRef.value?.setPointerCapture(activePointerId)
        }

        const pointerScale = 1 / (worldMapRef.value?.getScreenCTM()?.a || 1)
        const nextOffsetX =
            startOffsetX
            + (event.clientX - dragStartX) * pointerScale

        offsetX.value = clampOffsetX(nextOffsetX)

        if (props.zoom === 1 && !compactViewport.value) {
            return
        }

        const nextOffsetY =
            startOffsetY
            + (event.clientY - dragStartY) * pointerScale

        offsetY.value = clampOffsetY(nextOffsetY)
    }

    const endDrag = (event?: PointerEvent) => {
        if (event && dragging) {
            suppressClick = Math.hypot(
                event.clientX - dragStartX,
                event.clientY - dragStartY
            ) > 5
        }

        if (
            activePointerId !== null
            && worldMapRef.value?.hasPointerCapture(activePointerId)
        ) {
            worldMapRef.value.releasePointerCapture(activePointerId)
        }

        activePointerId = null
        dragging = false
    }

    const onMapMove = (event: PointerEvent) => {
        onDrag(event)
        void onTooltipMove(event)
    }

    const onMapLeave = () => {
        onCountryLeave()
    }

    const selectCountry = (country: Country) => {
        if (suppressClick) {
            suppressClick = false
            return
        }

        clearHoveredTooltip()

        getCountryElement(country.name)?.focus({ preventScroll: true })
        emit('country-click', country)
    }

    const onCountryFocus = async (
        country: RenderedCountry,
        event: FocusEvent
    ) => {
        const countryElement = event.currentTarget

        if (
            dragging
            || !(countryElement instanceof SVGPathElement)
            || !countryElement.matches(':focus-visible')
        ) {
            return
        }

        emit('country-focus', country.name)
        focusCountry(country.name)

        await setFocusedTooltip(country, countryElement)
    }

    const moveMap = (direction: MapMoveDirection) => {
        if (!moveAvailable.value[direction]) {
            return
        }

        if (direction === 'left' || direction === 'right') {
            offsetX.value = clampOffsetX(offsetX.value + (direction === 'left' ? moveStep : -moveStep))
        } else {
            offsetY.value = clampOffsetY(offsetY.value + (direction === 'up' ? moveStep : -moveStep))
        }

        hideTooltip()
    }

    const onMapKeyDown = (event: KeyboardEvent) => {
        const directions = {
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right',
            ArrowUp: 'up'
        } as const
        const direction = directions[event.key as keyof typeof directions]

        const currentCountry = event.target instanceof SVGPathElement
            ? getRenderedCountry(event.target.getAttribute('aria-label') ?? '')
            : null

        if (!direction || !currentCountry || !(event.target instanceof SVGPathElement)) {
            return
        }

        event.preventDefault()

        const horizontal = direction === 'left' || direction === 'right'
        const sign = direction === 'left' || direction === 'up' ? -1 : 1
        const candidates = countries.value.map((country) => {
            const deltaX = country.focusX - currentCountry.focusX
            const deltaY = country.focusY - currentCountry.focusY
            const forward = (horizontal ? deltaX : deltaY) * sign
            const perpendicular = Math.abs(horizontal ? deltaY : deltaX)

            return {
                country,
                forward,
                perpendicular,
                score: Math.hypot(deltaX, deltaY)
            }
        }).filter((candidate) => candidate.forward > 0)

        const alignedCandidates = candidates.filter((candidate) => {
            return candidate.perpendicular <= candidate.forward
        })

        const nextCountry = (alignedCandidates.length ? alignedCandidates : candidates)
            .sort((first, second) => first.score - second.score)[0]?.country

        if (nextCountry) {
            getCountryElement(nextCountry.name)?.focus({ preventScroll: true })
        }
    }

    onMounted(async () => {
        await loadCountries()

        if (!mapMounted) {
            return
        }

        if (!getAllCountries().length) {
            return
        }

        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })

        if (!mapMounted) {
            return
        }

        updateViewportSize()
        initializeWorldMap()
        offsetY.value = clampOffsetY(offsetY.value)
        focusCountry()
        await nextTick()
        mapReady.value = true

        resizeObserver = new ResizeObserver(onViewportResize)

        if (worldMapRef.value) {
            resizeObserver.observe(worldMapRef.value.parentElement ?? worldMapRef.value)
        }

        window.addEventListener('pointerup', endDrag)
        window.addEventListener('pointercancel', endDrag)
        window.addEventListener('scroll', updateTooltipPosition, true)
        window.addEventListener('resize', onWindowResize)
    })

    onBeforeUnmount(() => {
        mapMounted = false
        resizeObserver?.disconnect()
        window.removeEventListener('pointerup', endDrag)
        window.removeEventListener('pointercancel', endDrag)
        window.removeEventListener('scroll', updateTooltipPosition, true)
        window.removeEventListener('resize', onWindowResize)

        if (viewportResizeFrame !== null) {
            cancelAnimationFrame(viewportResizeFrame)
        }
        endDrag()
    })

    watch(
        mapReady,
        (ready) => {
            emit('map-ready-change', ready)
        },
        { immediate: true, flush: 'post' }
    )

    watch(
        moveAvailable,
        (availability) => {
            emit('move-availability-change', availability)
        },
        { immediate: true, flush: 'post' }
    )

    watch(
        [offsetX, offsetY, () => props.zoom],
        updateTooltipPosition,
        { flush: 'post' }
    )

    watch(
        () => props.zoom,
        async (zoom, previousZoom) => {
            if (props.focusedCountry) {
                await nextTick()
                focusCountry()
                return
            }

            const previousViewHeight = getViewHeight(previousZoom)
            const nextViewHeight = getViewHeight(zoom)

            const worldCenterX =
                (
                    viewWidth.value / 2
                    - offsetX.value
                )
                / getMapScale(previousZoom)

            const worldCenterY =
                (
                    previousViewHeight / 2
                    - offsetY.value
                )
                / getMapScale(previousZoom)

            offsetX.value = clampOffsetX(
                viewWidth.value / 2
                - worldCenterX * getMapScale(zoom),
                zoom
            )

            if (zoom === 1 && !compactViewport.value) {
                offsetY.value = initialOffsetY
                return
            }

            offsetY.value = clampOffsetY(
                nextViewHeight / 2
                - worldCenterY * getMapScale(zoom),
                zoom
            )
        }
    )

    watch(
        () => props.focusedCountry,
        async () => {
            hideTooltip()

            await nextTick()

            focusCountry()
        },
        {
            immediate: true
        }
    )

    return {
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
    }
}