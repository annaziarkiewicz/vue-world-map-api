import { useWorldMap } from '@/composables/useWorldMap'

import type {
    CountriesDevCityApi,
    CountriesDevCountryApi,
    CountryCapitalCoordinates,
    CountryDetails
} from '@/types/worldMap'

const capitalAliases: Record<string, string> = {
    'Naypyidaw': 'Nay Pyi Taw',
    'Nur-Sultan': 'Astana',
    'Washington, D.C.': 'Washington'
}

const unsupportedCountryNames = new Set([
    'Ashmore and Cartier Islands',
    'Baykonur Cosmodrome',
    'Brazilian Island',
    'Clipperton Island',
    'Coral Sea Islands',
    'Indian Ocean Territories'
])

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isOptionalString = (value: unknown) => {
    return value === undefined || value === null || typeof value === 'string'
}

const isOptionalNumber = (value: unknown) => {
    return value === undefined
        || value === null
        || (typeof value === 'number' && Number.isFinite(value) && value >= 0)
}

const isCountryResponse = (country: unknown): country is CountriesDevCountryApi => {
    return isRecord(country)
        && typeof country.alpha2Code === 'string'
        && /^[A-Z]{2}$/.test(country.alpha2Code)
        && typeof country.name === 'string'
        && isOptionalNumber(country.area)
        && isOptionalString(country.capital)
        && (country.currencies == null || (
            Array.isArray(country.currencies)
            && country.currencies.every((currency) => {
                return isRecord(currency)
                    && typeof currency.name === 'string'
                    && isOptionalString(currency.symbol)
            })
        ))
        && (country.languages == null || (
            Array.isArray(country.languages)
            && country.languages.every((language) => {
                return isRecord(language) && typeof language.name === 'string'
            })
        ))
        && isOptionalNumber(country.population)
        && isOptionalString(country.region)
        && isOptionalString(country.subregion)
        && (country.timezones == null || (
            Array.isArray(country.timezones)
            && country.timezones.every((timezone) => typeof timezone === 'string')
        ))
}

const isCityResponse = (value: unknown): value is CountriesDevCityApi[] => {
    return Array.isArray(value) && value.every((city) => {
        return isRecord(city)
            && typeof city.name === 'string'
            && typeof city.latitude === 'number'
            && Number.isFinite(city.latitude)
            && city.latitude >= -90
            && city.latitude <= 90
            && typeof city.longitude === 'number'
            && Number.isFinite(city.longitude)
            && city.longitude >= -180
            && city.longitude <= 180
    })
}

export const useCountryApi = () => {
    const { getCountryCode: getMapCountryCode } = useWorldMap()

    const getCountryCode = (countryName: string): string | null => {
        if (unsupportedCountryNames.has(countryName)) {
            return null
        }

        return getMapCountryCode(countryName)
    }

    const formatNumber = (
        value: number
    ) => {
        return Intl.NumberFormat('en').format(value)
    }

    const getCountryDetails = (
        country: CountriesDevCountryApi
    ): CountryDetails => {
        return {
            area: country.area
                ? `${formatNumber(country.area)} km²`
                : '',
            capital: country.capital ?? '',
            currencies: (country.currencies ?? []).map((currency) => {
                return currency.symbol
                    ? `${currency.name} (${currency.symbol})`
                    : currency.name
            }),
            languages: (country.languages ?? []).map((language) => {
                return language.name
            }),
            population: country.population
                ? formatNumber(country.population)
                : '',
            region: country.region ?? '',
            subregion: country.subregion ?? '',
            timezones: country.timezones ?? []
        }
    }

    const fetchJson = async <Data>(
        url: string,
        signal?: AbortSignal,
        validate?: (value: unknown) => value is Data
    ): Promise<Data | null> => {
        const response = await fetch(url, { signal })

        if (!response.ok) {
            return null
        }

        const data: unknown = await response.json()

        if (validate && !validate(data)) {
            return null
        }

        return data as Data
    }

    const getCapitalQueries = (
        capital: string
    ) => {
        return [
            capitalAliases[capital],
            capital.split(',')[0],
            capital
        ].filter((value): value is string => {
            return Boolean(value)
        }).filter((value, index, values) => {
            return values.indexOf(value) === index
        })
    }

    const loadCapitalCoordinates = async (
        capital: string,
        countryCode?: string,
        signal?: AbortSignal
    ): Promise<CountryCapitalCoordinates | null> => {
        if (!capital || !countryCode || countryCode === '-99') {
            return null
        }

        const capitalQueries = getCapitalQueries(capital)

        for (const capitalQuery of capitalQueries) {
            const searchParams = new URLSearchParams({
                country: countryCode,
                limit: '10',
                q: capitalQuery
            })

            const cities = await fetchJson<CountriesDevCityApi[]>(
                `https://countries.dev/cities?${searchParams}`,
                signal,
                isCityResponse
            )

            if (!cities?.length) {
                continue
            }

            const city = cities.find((item) => {
                return item.name.toLowerCase()
                    === capitalQuery.toLowerCase()
            })

            if (!city) {
                continue
            }

            return {
                latitude: city.latitude,
                longitude: city.longitude
            }
        }

        return null
    }

    const getCountryData = async (
        countryName: string,
        signal?: AbortSignal
    ) => {
        const countryCode = getCountryCode(countryName)

        if (!countryCode) {
            return null
        }

        const country = await fetchJson<CountriesDevCountryApi>(
            `https://countries.dev/alpha/${countryCode}`,
            signal,
            isCountryResponse
        )

        return country?.alpha2Code === countryCode ? country : null
    }

    const isAbortError = (caughtError: unknown) => {
        return caughtError instanceof Error
            && caughtError.name === 'AbortError'
    }

    return {
        fetchJson,
        getCountryCode,
        getCountryData,
        getCountryDetails,
        isAbortError,
        loadCapitalCoordinates
    }
}