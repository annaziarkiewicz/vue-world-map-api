import { ref } from 'vue'

import { useCountryApi } from '@/composables/useCountryApi'

import type {
    Country,
    CountryCapitalCoordinates,
    CountryDetails
} from '@/types/worldMap'

const createEmptyDetails = (): CountryDetails => {
    return {
        area: '',
        capital: '',
        currencies: [],
        languages: [],
        population: '',
        region: '',
        subregion: '',
        timezones: []
    }
}

export const useDetails = () => {
    const activeCountry = ref<Country | null>(null)
    const capitalCoordinatesLoading = ref(false)
    const capitalCoordinates = ref<CountryCapitalCoordinates | null>(null)
    const details = ref<CountryDetails>(createEmptyDetails())
    const detailsError = ref<string | null>(null)
    const detailsLoading = ref(false)
    const detailsVisible = ref(false)

    let detailsRequestController: AbortController | null = null

    const {
        getCountryCode,
        getCountryData,
        getCountryDetails,
        isAbortError,
        loadCapitalCoordinates
    } = useCountryApi()

    const resetDetails = () => {
        detailsRequestController?.abort()
        detailsRequestController = null
        activeCountry.value = null
        capitalCoordinates.value = null
        capitalCoordinatesLoading.value = false
        details.value = createEmptyDetails()
        detailsError.value = null
        detailsLoading.value = false
        detailsVisible.value = false
    }

    const loadCountryDetails = async (country: Country) => {
        detailsRequestController?.abort()

        const requestController = new AbortController()

        detailsRequestController = requestController
        capitalCoordinates.value = null
        capitalCoordinatesLoading.value = false
        details.value = createEmptyDetails()
        detailsError.value = null
        detailsLoading.value = true

        if (!getCountryCode(country.name)) {
            detailsError.value = 'No country details are available for this area.'
            detailsLoading.value = false
            detailsRequestController = null
            return
        }

        try {
            const countryData = await getCountryData(
                country.name,
                requestController.signal
            )

            if (detailsRequestController !== requestController) {
                return
            }

            if (!countryData) {
                detailsError.value = 'Country details could not be loaded.'
                return
            }

            details.value = getCountryDetails(countryData)
            detailsLoading.value = false
            capitalCoordinatesLoading.value = true

            const countryCode = countryData.alpha2Code
            try {
                const coordinates = await loadCapitalCoordinates(
                    details.value.capital,
                    countryCode,
                    requestController.signal
                )

                if (detailsRequestController === requestController) {
                    capitalCoordinates.value = coordinates
                }
            } catch (caughtError) {
                if (
                    isAbortError(caughtError)
                    || detailsRequestController !== requestController
                ) {
                    return
                }

                capitalCoordinates.value = null
            }
        } catch (caughtError) {
            if (
                isAbortError(caughtError)
                || detailsRequestController !== requestController
            ) {
                return
            }

            detailsError.value = 'Country details could not be loaded.'
        } finally {
            if (detailsRequestController === requestController) {
                detailsLoading.value = false
                capitalCoordinatesLoading.value = false
                detailsRequestController = null
            }
        }
    }

    const showCountryDetails = async (country: Country) => {
        activeCountry.value = country
        detailsVisible.value = true

        await loadCountryDetails(country)
    }

    return {
        activeCountry,
        capitalCoordinates,
        capitalCoordinatesLoading,
        details,
        detailsError,
        detailsLoading,
        detailsVisible,
        loadCountryDetails,
        resetDetails,
        showCountryDetails
    }
}