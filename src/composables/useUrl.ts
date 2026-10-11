import { ref } from 'vue'

export const useUrl = () => {
    const skipNextPopstateLoad = ref(false)
    const urlChangeId = ref(0)

    const invalidateUrlChange = () => {
        urlChangeId.value += 1
    }

    const getSearchStateFromUrl = () => {
        const searchParams = new URLSearchParams(window.location.search)

        return searchParams.get('search')?.trim() ?? ''
    }

    const getCountryStateFromUrl = () => {
        const searchParams = new URLSearchParams(window.location.search)

        return searchParams.get('country')?.trim() ?? ''
    }

    const getUrlParamsWithoutCountry = () => {
        const params = Object.fromEntries(new URLSearchParams(window.location.search))

        delete params.country

        return params
    }

    const updateUrl = (
        params: Record<string, string | null>,
        replaceCurrentEntry = false,
        state: Record<string, boolean> = {}
    ) => {
        invalidateUrlChange()

        const url = new URL(window.location.href)

        url.search = ''

        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value)
            } else {
                url.searchParams.delete(key)
            }
        })

        if (replaceCurrentEntry) {
            window.history.replaceState(state, '', url)
            return
        }

        window.history.pushState(state, '', url)
    }

    return {
        skipNextPopstateLoad,
        urlChangeId,
        getCountryStateFromUrl,
        getSearchStateFromUrl,
        getUrlParamsWithoutCountry,
        invalidateUrlChange,
        updateUrl
    }
}