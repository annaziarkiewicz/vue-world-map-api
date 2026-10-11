import { computed, ref } from 'vue'

import { useCountryApi } from '@/composables/useCountryApi'
import { useWorldMap } from '@/composables/useWorldMap'

import type { Suggestion } from '@/components/BlockSearchBarSuggestions.vue'
import type { MapZoom } from '@/types/worldMap'

export const useSearch = () => {
    const focusedCountry = ref<string | null>(null)
    const highlightedCountry = ref<string | null>(null)
    const loading = ref(false)
    const query = ref('')
    const searched = ref(false)
    const suggestionsVisible = ref(false)
    const zoom = ref<MapZoom>(1)

    let searchRequestController: AbortController | null = null

    const { getCountryData, isAbortError } = useCountryApi()
    const { getCountryCode, getSearchableCountries } = useWorldMap()

    const countryNames = computed(() => getSearchableCountries()
        .map((country) => country.properties.ADMIN)
        .sort((firstName, secondName) => firstName.localeCompare(secondName)))

    const normalizedQuery = computed(() => {
        return query.value.trim().toLowerCase()
    })

    const getFlagImage = (countryName: string): string | undefined => {
        const countryCode = getCountryCode(countryName)

        return countryCode
            ? `https://flagcdn.com/${countryCode.toLowerCase()}.svg`
            : undefined
    }

    const suggestions = computed<Suggestion[]>(() => {
        if (normalizedQuery.value.length < 2) {
            return []
        }

        return countryNames.value.filter((countryName) => {
            return countryName.toLowerCase().includes(normalizedQuery.value)
        }).map((countryName) => ({
            id: countryName,
            image: getFlagImage(countryName),
            label: countryName
        }))
    })

    const matchedCountry = computed(() => {
        return countryNames.value.find((countryName) => {
            return countryName.toLowerCase() === normalizedQuery.value
        }) ?? null
    })

    const getZoomByArea = (area: number): MapZoom => {
        if (area < 1000000) {
            return 4
        }

        if (area <= 8000000) {
            return 2
        }

        return 1
    }

    const cancelSearch = () => {
        searchRequestController?.abort()
        searchRequestController = null
        loading.value = false
    }

    const closeSuggestions = () => {
        suggestionsVisible.value = false
    }

    const updateQuery = (value: string) => {
        cancelSearch()
        query.value = value
        suggestionsVisible.value = true
    }

    const resetMapFocus = () => {
        cancelSearch()
        closeSuggestions()
        focusedCountry.value = null
        highlightedCountry.value = null
        query.value = ''
    }

    const resetSearch = () => {
        resetMapFocus()
        searched.value = false
        zoom.value = 1
    }

    const loadCountry = async (countryName: string) => {
        cancelSearch()
        closeSuggestions()

        const requestController = new AbortController()

        searchRequestController = requestController
        loading.value = true
        searched.value = true
        query.value = countryName

        let area: number | null = null

        try {
            const country = await getCountryData(
                countryName,
                requestController.signal
            )

            area = country?.area ?? null
        } catch (caughtError) {
            if (isAbortError(caughtError)) {
                return
            }
        } finally {
            if (searchRequestController === requestController) {
                loading.value = false
            }
        }

        if (searchRequestController !== requestController) {
            return
        }

        zoom.value = area === null ? 1 : getZoomByArea(area)
        highlightedCountry.value = countryName
        focusedCountry.value = countryName
        searchRequestController = null
    }

    return {
        focusedCountry,
        highlightedCountry,
        loading,
        matchedCountry,
        query,
        searched,
        suggestions,
        suggestionsVisible,
        zoom,
        cancelSearch,
        closeSuggestions,
        loadCountry,
        resetSearch,
        updateQuery
    }
}