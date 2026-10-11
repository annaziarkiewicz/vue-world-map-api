import { nextTick, ref, type Ref } from 'vue'

interface TooltipCountry {
    focusX: number
    focusY: number
    name: string
}

export const useTooltip = (worldMapRef: Ref<SVGSVGElement | null>) => {
    const cursorOffsetX = 4

    let focusedTooltipCountry: TooltipCountry | null = null
    let focusedTooltipElement: SVGPathElement | null = null
    let hoveredTooltipCountry: TooltipCountry | null = null
    let hoveredTooltipPosition: Pick<MouseEvent, 'clientX' | 'clientY'> | null = null

    const tooltip = ref({
        maxHeight: 0,
        maxWidth: 0,
        name: '',
        visible: false,
        x: 0,
        y: 0
    })

    const tooltipRef = ref<HTMLElement | null>(null)

    const hideTooltip = () => {
        tooltip.value.visible = false
    }

    const positionTooltip = async (
        position: Pick<MouseEvent, 'clientX' | 'clientY'>,
        centered = false
    ) => {
        const mapBounds = worldMapRef.value?.getBoundingClientRect()

        if (!tooltip.value.visible || !mapBounds) {
            return
        }

        const left = Math.max(0, mapBounds.left) + 4
        const right = Math.min(window.innerWidth, mapBounds.right) - 4
        const top = Math.max(0, mapBounds.top) + 4
        const bottom = Math.min(window.innerHeight, mapBounds.bottom) - 4

        if (right <= left || bottom <= top) {
            hideTooltip()
            return
        }

        tooltip.value.maxHeight = bottom - top
        tooltip.value.maxWidth = right - left

        await nextTick()

        if (!tooltipRef.value) {
            return
        }

        const tooltipWidth = tooltipRef.value.offsetWidth
        const tooltipHeight = tooltipRef.value.offsetHeight

        tooltip.value.x = Math.max(left, Math.min(
            position.clientX - tooltipWidth / 2 + (centered ? 0 : cursorOffsetX),
            right - tooltipWidth
        ))
        tooltip.value.y = Math.max(top, Math.min(
            centered ? position.clientY - tooltipHeight / 2 : position.clientY + 20,
            bottom - tooltipHeight
        ))
    }

    const showFocusedTooltip = async () => {
        await nextTick()

        if (hoveredTooltipCountry) {
            return
        }

        if (
            !focusedTooltipCountry
            || !focusedTooltipElement
            || document.activeElement !== focusedTooltipElement
        ) {
            hideTooltip()
            return
        }

        const transform = focusedTooltipElement.getScreenCTM()

        if (!transform) {
            hideTooltip()
            return
        }

        const center = new DOMPoint(
            focusedTooltipCountry.focusX,
            focusedTooltipCountry.focusY
        ).matrixTransform(transform)

        tooltip.value.name = focusedTooltipCountry.name
        tooltip.value.visible = true

        await positionTooltip({ clientX: center.x, clientY: center.y }, true)
    }

    const onTooltipMove = (event: MouseEvent) => {
        if (hoveredTooltipCountry) {
            hoveredTooltipPosition = { clientX: event.clientX, clientY: event.clientY }
            void positionTooltip(event)
        }
    }

    const onCountryHover = (
        country: TooltipCountry,
        event: MouseEvent
    ) => {
        hoveredTooltipCountry = country
        tooltip.value.name = country.name
        tooltip.value.visible = true

        void onTooltipMove(event)
    }

    const onCountryLeave = () => {
        hoveredTooltipCountry = null
        hoveredTooltipPosition = null
        void showFocusedTooltip()
    }

    const updateTooltipPosition = () => {
        if (!tooltip.value.visible) {
            return
        }

        if (hoveredTooltipCountry && hoveredTooltipPosition) {
            void positionTooltip(hoveredTooltipPosition)
        } else {
            void showFocusedTooltip()
        }
    }

    const onCountryBlur = () => {
        focusedTooltipCountry = null
        focusedTooltipElement = null

        if (!hoveredTooltipCountry) {
            hideTooltip()
        }
    }

    const clearHoveredTooltip = () => {
        hoveredTooltipCountry = null
        hoveredTooltipPosition = null
        hideTooltip()
    }

    const setFocusedTooltip = async (
        country: TooltipCountry,
        element: SVGPathElement
    ) => {
        focusedTooltipCountry = country
        focusedTooltipElement = element
        hoveredTooltipCountry = null
        hoveredTooltipPosition = null

        await showFocusedTooltip()
    }

    return {
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
    }
}