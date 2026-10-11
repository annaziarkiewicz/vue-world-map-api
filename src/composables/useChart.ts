import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useCountryApi } from '@/composables/useCountryApi'
import { useWorldMap } from '@/composables/useWorldMap'

import type {
    WorldBankIndicator,
    WorldBankIndicatorApi,
    WorldBankIndicatorResponseApi
} from '@/types/worldMap'

interface ChartItem {
    value: number
    year: number
}

interface ChartPoint extends ChartItem {
    x: number
    y: number
}

const isChartResponse = (value: unknown): value is WorldBankIndicatorResponseApi => {
    return Array.isArray(value)
        && value.length === 2
        && (value[1] === null || (
            Array.isArray(value[1])
            && value[1].every((item: unknown) => {
                if (typeof item !== 'object' || item === null) {
                    return false
                }

                const indicator = item as Record<string, unknown>

                return typeof indicator.date === 'string'
                    && /^\d{4}$/.test(indicator.date)
                    && (indicator.value === null || (
                        typeof indicator.value === 'number'
                        && Number.isFinite(indicator.value)
                    ))
            })
        ))
}

export const useChart = (
    getCountryName: () => string,
    getIndicator: () => WorldBankIndicator
) => {
    const chartErrorMessage = 'Chart data could not be loaded.'
    const chartHeight = 124
    const chartWidth = 248

    const paddingTop = 8
    const paddingRight = 8
    const paddingBottom = 22
    const paddingLeft = 44

    const {
        getCountryByName,
        loadCountries
    } = useWorldMap()

    const { fetchJson, isAbortError } = useCountryApi()

    let chartRequestController: AbortController | null = null

    const chartData = ref<ChartItem[]>([])
    const error = ref<string | null>(null)
    const loading = ref(false)

    const chartInnerHeight =
        chartHeight - paddingTop - paddingBottom

    const chartInnerWidth =
        chartWidth - paddingLeft - paddingRight

    const chartValues = computed(() => {
        return chartData.value.map((item) => item.value)
    })

    const minValue = computed(() => {
        if (!chartValues.value.length) {
            return 0
        }

        return Math.min(
            ...chartValues.value
        )
    })

    const maxValue = computed(() => {
        if (!chartValues.value.length) {
            return 0
        }

        return Math.max(
            ...chartValues.value
        )
    })

    const valueRange = computed(() => {
        return maxValue.value - minValue.value
    })

    const chartPoints = computed<ChartPoint[]>(() => {
        const firstYear = chartData.value[0]?.year ?? 0
        const lastYear = chartData.value[chartData.value.length - 1]?.year ?? firstYear
        const yearRange = lastYear - firstYear

        return chartData.value.map((item) => {
            const x = yearRange > 0
                ? paddingLeft
                    + ((item.year - firstYear) / yearRange) * chartInnerWidth
                : paddingLeft

            const y = valueRange.value > 0
                ? paddingTop
                    + ((maxValue.value - item.value) / valueRange.value) * chartInnerHeight
                : paddingTop + chartInnerHeight / 2

            return {
                ...item,
                x,
                y
            }
        })
    })

    const chartPath = computed(() => {
        return chartPoints.value
            .map((point, index) => {
                return `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`
            })
            .join(' ')
    })

    const horizontalLines = computed(() => {
        if (valueRange.value === 0) {
            return [{
                label: formatAxisValue(maxValue.value),
                y: paddingTop + chartInnerHeight / 2
            }]
        }

        const steps = 3

        return Array.from(
            { length: steps },
            (_, index) => {
                const ratio = index / (steps - 1)
                const value =
                    maxValue.value
                    - valueRange.value * ratio

                return {
                    label: formatAxisValue(value),
                    y: paddingTop + chartInnerHeight * ratio
                }
            }
        )
    })

    const yearLabels = computed(() => {
        if (!chartPoints.value.length) {
            return []
        }

        const indexes = [
            0,
            Math.floor((chartPoints.value.length - 1) / 2),
            chartPoints.value.length - 1
        ]

        return [...new Set(indexes)].map((index) => {
            const point = chartPoints.value[index]

            return {
                x: point.x,
                year: point.year
            }
        })
    })

    const formatAxisValue = (value: number) => {
        if (getIndicator() === 'SP.POP.TOTL') {
            return Intl.NumberFormat('en', {
                maximumFractionDigits: 1,
                notation: 'compact'
            }).format(value)
        }

        return value.toFixed(1)
    }

    const getWorldBankCountryCode = () => {
        const country = getCountryByName(getCountryName())

        if (!country) {
            return null
        }

        if (getCountryName() === 'Kosovo') {
            return 'XK'
        }

        const countryCodes = [
            country.properties.ISO_A3,
            country.properties.ISO_A2,
            country.properties.WB_A2,
            country.properties.ISO_A2_EH
        ]

        return countryCodes.find((countryCode) => {
            return Boolean(
                countryCode
                && countryCode !== '-99'
                && (
                    countryCode.length === 2
                    || countryCode.length === 3
                )
            )
        }) ?? null
    }

    const loadChartData = async () => {
        chartRequestController?.abort()

        const requestController = new AbortController()

        chartRequestController = requestController
        await loadCountries()

        if (chartRequestController !== requestController) {
            return
        }

        const countryCode = getWorldBankCountryCode()
        const currentYear = new Date().getFullYear()

        chartData.value = []
        error.value = null
        loading.value = false

        if (!countryCode) {
            error.value = chartErrorMessage
            return
        }

        loading.value = true

        try {
            const responseData = await fetchJson<WorldBankIndicatorResponseApi>(
                `https://api.worldbank.org/v2/country/${countryCode}/indicator/${getIndicator()}?date=2000:${currentYear}&format=json&per_page=100`,
                requestController.signal,
                isChartResponse
            )

            if (chartRequestController !== requestController) {
                return
            }

            if (!responseData) {
                error.value = chartErrorMessage
                return
            }

            const items = (responseData[1] ?? [])
                .filter((item): item is WorldBankIndicatorApi & { value: number } => {
                    return typeof item.value === 'number'
                })
                .map((item) => {
                    return {
                        value: item.value,
                        year: Number(item.date)
                    }
                })
                .sort((firstItem, secondItem) => {
                    return firstItem.year - secondItem.year
                })

            if (!items.length) {
                error.value = chartErrorMessage
                return
            }

            chartData.value = items
        } catch (caughtError) {
            if (
                isAbortError(caughtError)
                || chartRequestController !== requestController
            ) {
                return
            }

            error.value = chartErrorMessage
        } finally {
            if (chartRequestController === requestController) {
                loading.value = false
                chartRequestController = null
            }
        }
    }

    watch(
        () => [
            getCountryName(),
            getIndicator()
        ],
        () => {
            void loadChartData()
        },
        {
            immediate: true
        }
    )

    onBeforeUnmount(() => {
        chartRequestController?.abort()
        chartRequestController = null
    })

    return {
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
    }
}