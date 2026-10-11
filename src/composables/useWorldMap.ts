import { ref, shallowRef } from 'vue'

import type { CountryGeometry, NaturalEarthCountryApi } from '@/types/worldMap'

const countries = shallowRef<NaturalEarthCountryApi[]>([])
const countriesError = ref<string | null>(null)

let countriesRequest: Promise<void> | null = null

const loadCountries = (): Promise<void> => {
    if (countries.value.length) {
        return Promise.resolve()
    }

    if (countriesRequest) {
        return countriesRequest
    }

    countriesError.value = null
    countriesRequest = import('@/assets/ne_10m_admin_0_countries.json')
        .then((module) => {
            countries.value = (module.default as {
                features: NaturalEarthCountryApi[]
            }).features
        })
        .catch(() => {
            countriesError.value = 'World map could not be loaded.'
        })
        .finally(() => {
            countriesRequest = null
        })

    return countriesRequest
}

const getRingArea = (
    coordinates: number[][]
) => {
    let area = 0

    for (let index = 0; index < coordinates.length; index += 1) {
        const current = coordinates[index]
        const next = coordinates[
            (index + 1) % coordinates.length
        ]

        area +=
            current[0] * next[1]
            - next[0] * current[1]
    }

    return Math.abs(area / 2)
}

const getPolygonArea = (
    polygon: number[][][]
) => {
    const outerRing = polygon[0]

    if (!outerRing) {
        return 0
    }

    return getRingArea(outerRing)
}

const getMainCountryGeometry = (
    geometry: CountryGeometry
): CountryGeometry => {
    if (geometry.type === 'Polygon') {
        return geometry
    }

    const mainPolygon = geometry.coordinates.reduce(
        (largestPolygon, polygon) => {
            if (!largestPolygon) {
                return polygon
            }

            return getPolygonArea(polygon)
                > getPolygonArea(largestPolygon)
                ? polygon
                : largestPolygon
        },
        null as number[][][] | null
    )

    if (!mainPolygon) {
        return geometry
    }

    return {
        type: 'Polygon',
        coordinates: mainPolygon
    }
}

const buildPathFromGeometry = (
    geometry: CountryGeometry,
    projectCoordinates: (
        longitude: number,
        latitude: number
    ) => [number, number]
) => {
    const polygonToPath = (
        coordinates: number[][]
    ) => {
        return coordinates
            .map(([longitude, latitude], index) => {
                const [x, y] = projectCoordinates(
                    longitude,
                    latitude
                )

                return `${index === 0 ? 'M' : 'L'}${x} ${y}`
            })
            .join(' ') + ' Z'
    }

    return geometry.type === 'Polygon'
        ? geometry.coordinates
            .map(polygonToPath)
            .join(' ')
        : geometry.coordinates
            .flat()
            .map(polygonToPath)
            .join(' ')
}

export const useWorldMap = () => {
    const buildProjectedShape = (
        geometry: CountryGeometry,
        projectCoordinates: (
            longitude: number,
            latitude: number
        ) => [number, number]
    ) => {
        let minX = Infinity
        let maxX = -Infinity
        let minY = Infinity
        let maxY = -Infinity

        const projectWithBounds = (
            longitude: number,
            latitude: number
        ): [number, number] => {
            const [x, y] = projectCoordinates(
                longitude,
                latitude
            )

            minX = Math.min(minX, x)
            maxX = Math.max(maxX, x)
            minY = Math.min(minY, y)
            maxY = Math.max(maxY, y)

            return [x, y]
        }

        const d = buildPathFromGeometry(
            geometry,
            projectWithBounds
        )

        return {
            d,
            viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
        }
    }

    const buildWorldMapProjector = (
        height: number
    ) => {
        const latitudeMax = 85
        const latitudeMin = -60
        const worldWidth = height * 2

        return (
            longitude: number,
            latitude: number
        ): [number, number] => {
            const x =
                ((longitude + 180) / 360)
                * worldWidth

            const y =
                (
                    (latitudeMax - latitude)
                    / (latitudeMax - latitudeMin)
                )
                * height

            return [x, y]
        }
    }

    const getAllCountries = () => {
        return countries.value.filter((country) => {
            return country.properties.ADMIN !== 'Antarctica'
        })
    }

    const getCountryByName = (
        countryName: string
    ) => {
        return countries.value.find((country) => {
            return country.properties.ADMIN === countryName
        })
    }

    const getCountryCode = (countryName: string): string | null => {
        const country = getCountryByName(countryName)
        const countryCodes = [
            country?.properties.ISO_A2,
            country?.properties.ISO_A2_EH,
            country?.properties.WB_A2
        ]

        return countryCodes.find((code): code is string => {
            return typeof code === 'string' && /^[A-Z]{2}$/.test(code)
        }) ?? null
    }

    const getSearchableCountries = () => {
        return getAllCountries().filter((country) => {
            const {
                ADMIN: countryName,
                ISO_A2_EH: countryCode,
                SOVEREIGNT: sovereignName,
                TYPE: countryType
            } = country.properties

            if (countryCode === 'PS') {
                return true
            }

            return countryName === sovereignName
                && ['Sovereign country', 'Country', 'Sovereignty', 'Disputed'].includes(countryType)
                && /^[A-Z]{2}$/.test(countryCode ?? '')
                && countryCode !== 'TW'
                && countryCode !== 'XK'
        })
    }

    return {
        countriesError,
        loadCountries,
        buildProjectedShape,
        buildWorldMapProjector,
        getAllCountries,
        getSearchableCountries,
        getCountryByName,
        getCountryCode,
        getMainCountryGeometry
    }
}