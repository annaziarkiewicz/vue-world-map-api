<template>
    <section
        class="az-app"
        :class="{ 'az-app--inside-iframe': isIframe }"
    >
        <BlockSearchBar
            ref="searchBarRef"
            :disabled="loading || (!query.trim() && !searched)"
            :loading="loading"
            :model-value="query"
            placeholder="Enter a country name to locate it on the map..."
            :suggestions-enabled="true"
            @close-suggestions="closeSuggestions"
            @search="searchCountry"
            @update:model-value="updateSearchQuery"
        >
            <template
                v-if="suggestionsVisible && suggestions.length"
                #suggestions="{ suggestionsId }"
            >
                <BlockSearchBarSuggestions
                    :id="suggestionsId"
                    aria-label="Country suggestions"
                    :image-rounded="false"
                    image-shape="landscape"
                    :suggestions="suggestions"
                    @close="closeSuggestionOptions"
                    @select="selectSuggestion"
                />
            </template>
        </BlockSearchBar>

        <BlockError v-if="countriesError" :message="countriesError" />

        <BlockWorldMap
            ref="worldMapRef"
            :focused-country="focusedCountry"
            :height="mapHeight"
            :highlighted-country="highlightedCountry"
            :zoom="zoom"
            @country-click="openCountry"
            @country-focus="focusedCountry = $event"
            @map-ready-change="mapReady = $event"
            @move-availability-change="moveAvailable = $event"
        />

        <BlockMapControls
            v-if="mapReady"
            v-model="zoom"
            :move-available="moveAvailable"
            @move="worldMapRef?.moveMap($event)"
        />

        <BlockResultDetails
            v-if="activeCountry"
            :key="activeCountry.name"
            :capital-coordinates="capitalCoordinates"
            :capital-coordinates-loading="capitalCoordinatesLoading"
            :country="activeCountry"
            :details="details"
            :error="detailsError"
            :loading="detailsLoading"
            :model-value="detailsVisible"
            @update:model-value="updateDetailsVisibility"
        />
    </section>

    <BlockSplinter :is-iframe="isIframe" />
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { useDetails } from '@/composables/useDetails'
import { useIframeCommunication } from '@/composables/useIframeCommunication'
import { useSearch } from '@/composables/useSearch'
import { useUrl } from '@/composables/useUrl'
import { useWorldMap } from '@/composables/useWorldMap'

import BlockError from '@/components/BlockError.vue'
import BlockMapControls from '@/components/BlockMapControls.vue'
import BlockResultDetails from '@/components/BlockResultDetails.vue'
import BlockSearchBar from '@/components/BlockSearchBar.vue'
import BlockSearchBarSuggestions from '@/components/BlockSearchBarSuggestions.vue'
import BlockSplinter from '@/components/BlockSplinter.vue'
import BlockWorldMap from '@/components/BlockWorldMap.vue'

import type { Suggestion } from '@/components/BlockSearchBarSuggestions.vue'
import type { Country, MapMoveDirection } from '@/types/worldMap'

const mapHeight = 580
const mapReady = ref(false)
const moveAvailable = ref<Record<MapMoveDirection, boolean>>({
    down: false,
    left: false,
    right: false,
    up: false
})
const detailsReturnFocus = ref<HTMLElement | SVGElement | null>(null)
const searchBarRef = ref<InstanceType<typeof BlockSearchBar> | null>(null)
const worldMapRef = ref<InstanceType<typeof BlockWorldMap> | null>(null)

const { isIframe } = useIframeCommunication()
const { countriesError, getAllCountries, loadCountries } = useWorldMap()

const {
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
} = useSearch()

const {
    activeCountry,
    capitalCoordinates,
    capitalCoordinatesLoading,
    details,
    detailsError,
    detailsLoading,
    detailsVisible,
    resetDetails,
    showCountryDetails
} = useDetails()

const {
    skipNextPopstateLoad,
    urlChangeId,
    getCountryStateFromUrl,
    getSearchStateFromUrl,
    getUrlParamsWithoutCountry,
    invalidateUrlChange,
    updateUrl
} = useUrl()

const resetApplication = () => {
    resetSearch()
    resetDetails()
}

const loadSearchResults = (countryName: string) => {
    resetDetails()

    return loadCountry(countryName)
}

const updateSearchQuery = (value: string) => {
    invalidateUrlChange()
    updateQuery(value)
}

const closeSuggestionOptions = () => {
    closeSuggestions()
    searchBarRef.value?.focusInput()
}

const selectSuggestion = (suggestion: Suggestion) => {
    closeSuggestionOptions()
    void searchCountry(suggestion.label)
}

const searchCountry = async (selectedName?: string) => {
    closeSuggestions()

    const countryName = selectedName ?? matchedCountry.value

    if (!countryName) {
        if (!query.value.trim() && searched.value) {
            updateUrl({
                country: null,
                search: null
            })

            resetApplication()
        }

        return
    }

    updateUrl({
        country: null,
        search: countryName
    })

    await loadSearchResults(countryName)
}

const restoreDetailsFocus = async () => {
    await nextTick()

    if (detailsVisible.value) {
        return
    }

    if (detailsReturnFocus.value?.isConnected) {
        detailsReturnFocus.value.focus()
    } else {
        searchBarRef.value?.focusInput()
    }

    detailsReturnFocus.value = null
}

const openCountry = async (country: Country) => {
    if (!detailsVisible.value) {
        detailsReturnFocus.value = document.activeElement instanceof HTMLElement
            || document.activeElement instanceof SVGElement
            ? document.activeElement
            : null

        if (detailsReturnFocus.value === document.body) {
            detailsReturnFocus.value = null
        }
    }

    closeSuggestions()
    cancelSearch()

    updateUrl({
        ...getUrlParamsWithoutCountry(),
        country: country.name
    }, detailsVisible.value && Boolean(window.history.state?.countryDetails), {
        countryDetails: true
    })

    await showCountryDetails(country)
}

const updateDetailsVisibility = (value: boolean) => {
    if (value) {
        detailsVisible.value = true
        return
    }

    if (activeCountry.value && activeCountry.value.name !== highlightedCountry.value) {
        highlightedCountry.value = null
    }

    if (window.history.state?.countryDetails) {
        skipNextPopstateLoad.value = true
        resetDetails()
        void restoreDetailsFocus()
        window.history.back()
        return
    }

    updateUrl(getUrlParamsWithoutCountry(), true)
    resetDetails()
    void restoreDetailsFocus()
}

const handleUrlChange = async () => {
    const currentUrlChangeId = ++urlChangeId.value

    await loadCountries()

    if (currentUrlChangeId !== urlChangeId.value) {
        return
    }

    const countryName = getCountryStateFromUrl()
    const searchQuery = getSearchStateFromUrl()

    if (searchQuery) {
        query.value = searchQuery

        if (matchedCountry.value) {
            await loadSearchResults(matchedCountry.value)
        } else {
            resetApplication()
        }
    } else {
        resetApplication()
    }

    if (currentUrlChangeId !== urlChangeId.value) {
        return
    }

    if (!countryName) {
        resetDetails()
        return
    }

    const mapCountry = getAllCountries().find((country) => {
        return country.properties.ADMIN.toLowerCase() === countryName.toLowerCase()
    })

    if (!mapCountry) {
        resetDetails()
        return
    }

    await showCountryDetails({
        id: mapCountry.properties.ISO_A2,
        name: mapCountry.properties.ADMIN,
        path: ''
    })
}

const handlePopstate = async () => {
    if (skipNextPopstateLoad.value) {
        skipNextPopstateLoad.value = false
        return
    }

    const wasDetailsVisible = detailsVisible.value
    const urlChange = handleUrlChange()
    const currentUrlChangeId = urlChangeId.value

    await urlChange

    if (
        wasDetailsVisible
        && !detailsVisible.value
        && currentUrlChangeId === urlChangeId.value
    ) {
        await restoreDetailsFocus()
    }
}

onMounted(() => {
    window.addEventListener('popstate', handlePopstate)
    void handleUrlChange()
})

onBeforeUnmount(() => {
    window.removeEventListener('popstate', handlePopstate)
    invalidateUrlChange()
    cancelSearch()
    resetDetails()
})
</script>

<style lang="scss" scoped>
.az-app {
    --map-controls-space: 0px;
    --map-viewport-height: 580px;

    position: relative;
    overflow: hidden;
    width: 100%;
    max-width: 960px;
    min-height: 680px;
    padding: 24px 36px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    background: #B6B6AF;

    &:not(.az-app--inside-iframe) {
        margin-block-start: 24px;
    }

    @media (max-width: 767px) {
        --map-controls-space: 100px;
        --map-viewport-height: 480px;

        min-height: calc(100px + var(--map-viewport-height) + var(--map-controls-space));
        padding-inline: 24px;
    }
}
</style>