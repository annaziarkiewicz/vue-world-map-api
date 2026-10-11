export type CountryGeometry =
    | {
        type: 'Polygon'
        coordinates: number[][][]
    }
    | {
        type: 'MultiPolygon'
        coordinates: number[][][][]
    }

export type MapMoveDirection = 'up' | 'down' | 'left' | 'right'

export type MapZoom = 1 | 2 | 4

export type WorldBankIndicator =
    | 'SP.POP.TOTL'
    | 'SP.DYN.LE00.IN'

export type WorldBankIndicatorResponseApi = [
    unknown,
    WorldBankIndicatorApi[] | null
]

export interface Country {
    id: string
    name: string
    path: string
}

export interface CountryCapitalCoordinates {
    latitude: number
    longitude: number
}

export interface CountryDetails {
    area: string
    capital: string
    currencies: string[]
    languages: string[]
    population: string
    region: string
    subregion: string
    timezones: string[]
}

export interface CountriesDevCityApi {
    latitude: number
    longitude: number
    name: string
}

export interface CountriesDevCountryApi {
    alpha2Code: string
    area?: number | null
    capital?: string | null
    currencies?: CountriesDevCurrencyApi[] | null
    languages?: CountriesDevLanguageApi[] | null
    name: string
    population?: number | null
    region?: string | null
    subregion?: string | null
    timezones?: string[] | null
}

export interface CountriesDevCurrencyApi {
    name: string
    symbol?: string | null
}

export interface CountriesDevLanguageApi {
    name: string
}

export interface NaturalEarthCountryApi {
    geometry: CountryGeometry
    properties: {
        ADMIN: string
        ISO_A2: string
        ISO_A2_EH?: string
        ISO_A3?: string
        SOVEREIGNT: string
        TYPE: string
        WB_A2?: string
    }
}

export interface WorldBankIndicatorApi {
    date: string
    value: number | null
}