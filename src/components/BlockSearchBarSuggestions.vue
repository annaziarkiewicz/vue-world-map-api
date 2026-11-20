<template>
    <div
        ref="suggestionsContainerRef"
        :class="[
            'az-search-bar-suggestions',
            {
                'az-search-bar-suggestions--scrollable': scrollbarVisible,
                'az-search-bar-suggestions--with-select': withSelect
            }
        ]"
    >
        <div
            ref="suggestionsRef"
            :id="id"
            class="az-search-bar-suggestions__list"
            :aria-label="ariaLabel"
            role="listbox"
            @scroll="updateScrollbar"
        >
            <button
                v-for="(suggestion, index) in suggestions"
                :key="suggestion.id"
                ref="optionElements"
                class="az-search-bar-suggestions__option"
                :aria-posinset="index + 1"
                :aria-selected="index === activeOptionIndex"
                :aria-setsize="totalOptions ?? suggestions?.length ?? 0"
                role="option"
                :class="{
                    'az-search-bar-suggestions__option--landscape': imageShape === 'landscape'
                }"
                :tabindex="index === activeOptionIndex ? 0 : -1"
                type="button"
                @mousedown.prevent
                @click="selectSuggestion(suggestion)"
                @focus="activeOptionIndex = index"
                @keydown="onOptionKeyDown($event, index)"
            >
                <img
                    v-if="suggestion.image && !failedImageIds.has(suggestion.id)"
                    class="az-search-bar-suggestions__image"
                    alt=""
                    :class="[
                        `az-search-bar-suggestions__image--${imageShape}`,
                        { 'az-search-bar-suggestions__image--rounded': imageRounded }
                    ]"
                    :src="suggestion.image"
                    @error="onImageError(suggestion.id)"
                >

                <span
                    v-else
                    aria-hidden="true"
                    class="az-search-bar-suggestions__image"
                    :class="[
                        `az-search-bar-suggestions__image--${imageShape}`,
                        { 'az-search-bar-suggestions__image--rounded': imageRounded }
                    ]"
                >
                    No image
                </span>

                <span class="az-search-bar-suggestions__content">
                    <span class="az-search-bar-suggestions__label">
                        {{ suggestion.label }}
                    </span>

                    <span
                        v-if="suggestion.description"
                        class="az-search-bar-suggestions__description"
                    >
                        {{ suggestion.description }}
                    </span>
                </span>
            </button>

            <div
                v-if="!suggestions?.length"
                aria-disabled="true"
                class="az-search-bar-suggestions__empty"
                role="option"
            >
                {{ emptyMessage }}
            </div>

            <slot name="footer" />
        </div>

        <div
            v-if="scrollbarVisible"
            aria-hidden="true"
            class="az-search-bar-suggestions__scrollbar"
        >
            <div
                class="az-search-bar-suggestions__scrollbar-thumb"
                :style="{
                    height: `${scrollbarThumbHeight}px`,
                    transform: `translateY(${scrollbarThumbOffset}px)`
                }"
                @mousedown.prevent="startScrollbarDrag"
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    nextTick,
    onBeforeUnmount,
    onMounted,
    reactive,
    ref,
    watch
} from 'vue'

export type Suggestion = {
    description?: string
    id: number | string
    image?: string | null
    label: string
}

const props = withDefaults(defineProps<{
    ariaLabel?: string
    emptyMessage?: string
    id?: string
    imageRounded?: boolean
    imageShape?: 'square' | 'landscape' | 'portrait'
    suggestions?: Suggestion[]
    totalOptions?: number
    withSelect?: boolean
}>(), {
    ariaLabel: 'Search suggestions',
    emptyMessage: 'No results found',
    imageRounded: true,
    imageShape: 'square',
    suggestions: () => [],
    withSelect: false
})

const emit = defineEmits<{
    (event: 'close'): void
    (event: 'select', suggestion: Suggestion): void
}>()

const scrollbarBottom = 24
const scrollbarTop = 12

const activeOptionIndex = ref(0)
const failedImageIds = reactive(new Set<number | string>())
const optionElements = ref<HTMLButtonElement[]>([])
const scrollbarThumbHeight = ref(0)
const scrollbarThumbOffset = ref(0)
const scrollbarVisible = ref(false)
const suggestionsContainerRef = ref<HTMLElement | null>(null)
const suggestionsRef = ref<HTMLElement | null>(null)

let draggingScrollbar = false
let dragStartScrollTop = 0
let dragStartY = 0

const resetScrollbar = () => {
    scrollbarThumbHeight.value = 0
    scrollbarThumbOffset.value = 0
    scrollbarVisible.value = false
}

const updateScrollbar = () => {
    const suggestionsElement = suggestionsRef.value

    if (!suggestionsElement) {
        resetScrollbar()
        return
    }

    const {
        clientHeight,
        scrollHeight,
        scrollTop
    } = suggestionsElement

    scrollbarVisible.value = scrollHeight > clientHeight

    if (!scrollbarVisible.value) {
        resetScrollbar()
        return
    }

    const trackHeight =
        clientHeight
        - scrollbarTop
        - scrollbarBottom

    const thumbHeight = Math.max(
        32,
        trackHeight * (clientHeight / scrollHeight)
    )

    const maxScrollTop = scrollHeight - clientHeight
    const maxThumbOffset = trackHeight - thumbHeight

    scrollbarThumbHeight.value = thumbHeight

    scrollbarThumbOffset.value = maxScrollTop > 0
        ? (scrollTop / maxScrollTop) * maxThumbOffset
        : 0
}

const focusOption = (index: number) => {
    const optionsCount = optionElements.value.length

    if (!optionsCount) {
        return
    }

    const nextIndex = (
        index
        + optionsCount
    ) % optionsCount

    activeOptionIndex.value = nextIndex
    optionElements.value[nextIndex]?.focus()
}

const focusSearchInput = () => {
    const searchInput = suggestionsContainerRef.value
        ?.closest('form')
        ?.querySelector<HTMLInputElement>('input[name="search"]')

    nextTick(() => {
        searchInput?.focus()
    })
}

const closeSuggestions = () => {
    emit('close')
    focusSearchInput()
}

const selectSuggestion = (suggestion: Suggestion) => {
    emit('select', suggestion)
    focusSearchInput()
}

const onImageError = (id: number | string) => {
    failedImageIds.add(id)
}

const onOptionKeyDown = (
    event: KeyboardEvent,
    index: number
) => {
    if (event.key === 'Escape') {
        event.preventDefault()
        closeSuggestions()
        return
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault()
        focusOption(index + 1)
        return
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault()
        focusOption(index - 1)
        return
    }

    if (event.key === 'Home') {
        event.preventDefault()
        focusOption(0)
        return
    }

    if (event.key === 'End') {
        event.preventDefault()
        focusOption(optionElements.value.length - 1)
    }
}

const startScrollbarDrag = (event: MouseEvent) => {
    const suggestionsElement = suggestionsRef.value

    if (!suggestionsElement) {
        return
    }

    draggingScrollbar = true
    dragStartScrollTop = suggestionsElement.scrollTop
    dragStartY = event.clientY
}

const onScrollbarDrag = (event: MouseEvent) => {
    if (!draggingScrollbar) {
        return
    }

    const suggestionsElement = suggestionsRef.value

    if (!suggestionsElement) {
        return
    }

    const {
        clientHeight,
        scrollHeight
    } = suggestionsElement

    const trackHeight =
        clientHeight
        - scrollbarTop
        - scrollbarBottom

    const maxThumbOffset =
        trackHeight - scrollbarThumbHeight.value

    const maxScrollTop =
        scrollHeight - clientHeight

    if (maxThumbOffset <= 0) {
        return
    }

    const deltaY = event.clientY - dragStartY

    suggestionsElement.scrollTop =
        dragStartScrollTop
        + (deltaY / maxThumbOffset) * maxScrollTop
}

const stopScrollbarDrag = () => {
    draggingScrollbar = false
}

const onDocumentPointerDown = (event: PointerEvent) => {
    const target = event.target

    if (
        target instanceof Node
        && !suggestionsContainerRef.value?.contains(target)
    ) {
        emit('close')
    }
}

watch(
    () => props.suggestions,
    async () => {
        activeOptionIndex.value = 0
        failedImageIds.clear()

        await nextTick()
        updateScrollbar()
    },
    {
        deep: true
    }
)

onMounted(() => {
    document.addEventListener('pointerdown', onDocumentPointerDown)
    window.addEventListener('mousemove', onScrollbarDrag)
    window.addEventListener('mouseup', stopScrollbarDrag)
    window.addEventListener('resize', updateScrollbar)

    nextTick(updateScrollbar)
})

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onDocumentPointerDown)
    window.removeEventListener('mousemove', onScrollbarDrag)
    window.removeEventListener('mouseup', stopScrollbarDrag)
    window.removeEventListener('resize', updateScrollbar)
})
</script>

<style lang="scss" scoped>
.az-search-bar-suggestions {
    position: relative;

    &--with-select {
        .az-search-bar-suggestions__empty,
        .az-search-bar-suggestions__option {
            padding-inline-start: 24px;
        }
    }

    &--scrollable {
        .az-search-bar-suggestions__option {
            &:last-child {
                margin-block-end: 24px;
            }
        }
    }

    &__list {
        overflow-y: auto;
        max-height: 385px;
        border-top: 1px solid $color-milk-400;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    &__option {
        width: 100%;
        padding: 8px 32px;
        display: flex;
        align-items: center;
        gap: 12px;
        text-align: left;

        &:hover {
            background: $color-milk-600;
        }

        &:focus-visible {
            background: $color-grey-300;
        }

        &--landscape {
            height: 64px;
        }

        @media (min-width: 768px) {
            height: 64px;
        }
    }

    &__image {
        width: 48px;
        height: 48px;
        display: flex;
        flex-shrink: 0;
        justify-content: center;
        align-items: center;
        background: $color-milk-300;
        object-fit: cover;
        font-size: 9px;
        color: $color-milk-600;

        &--landscape {
            height: 32px;
            object-fit: contain;

            &:is(img) {
                height: auto;
                background: transparent;
            }
        }

        &--portrait {
            width: 32px;
        }

        &--rounded {
            border-radius: 50%;
        }
    }

    &__content {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    &__label {
        overflow: hidden;
        font-size: 20px;
        line-height: 1.25em;
        color: $color-milk-200;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__description {
        overflow: hidden;
        font-size: 12px;
        line-height: 1em;
        color: $color-sand-400;
        text-transform: uppercase;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__empty {
        padding: 8px 32px;
        font-size: 20px;
        line-height: 1.5em;
        color: $color-milk-200;
    }

    &__scrollbar {
        position: absolute;
        top: 12px;
        bottom: 24px;
        right: 0;
        width: 12px;
        background: $color-milk-400;
        border-right: 4px solid $color-milk-500;

        &-thumb {
            width: 8px;
            background: $color-milk-200;
            border-radius: 4px;
            cursor: grab;

            &:active {
                cursor: grabbing;
            }
        }
    }
}
</style>