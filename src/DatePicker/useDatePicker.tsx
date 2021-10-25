import {format, isEqual, isAfter, isBefore, addMonths, subMonths} from 'date-fns'
import deepmerge from 'deepmerge'
import React, {createContext, useCallback, useContext, useMemo, useEffect, useState} from 'react'

export type AnchorVariant = 'input' | 'button' | 'icon-only'
export type DateFormat = 'short' | 'long' | string
export type SelectionVariant = 'single' | 'multi' | 'range'
export interface DatePickerConfiguration {
  anchorVariant?: AnchorVariant
  blockedDates?: Array<Date>
  confirmation?: boolean
  contiguousSelection?: boolean
  dateFormat?: DateFormat
  dimWeekends?: boolean
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  rangeIncrement?: number
  selection?: SelectionVariant
  view?: '1-month' | '2-month'
  weekStartsOn?: 'Sunday' | 'Monday'
}

export type RangeSelection = {
  from: Date
  to: Date | null
}

export type StringRangeSelection = {
  from: string
  to: string
}

export interface DatePickerContext {
  disabled?: boolean
  configuration: DatePickerConfiguration
  currentViewingDate: Date
  goToMonth: (date: Date) => void
  hoverRange?: RangeSelection | null
  selection?: Selection
  softSelection?: Partial<RangeSelection> | null
  selectionActive?: boolean
  formattedDate: string
  nextMonth: () => void
  onSelection: (date: Date) => void
  onDayFocus: (date: Date) => void
  onDayBlur: (date: Date) => void
  previousMonth: () => void
  revertValue: () => void
  saveValue: (selection?: Selection) => void
}

export type Selection = Date | Array<Date> | RangeSelection | null
export type StringSelection = string | Array<string> | {to: string; from: string} | null
export type DaySelection = boolean | 'start' | 'middle' | 'end'

const DatePickerContext = createContext<DatePickerContext | null>(null)

const useDatePicker = (date?: Date) => {
  const value = useContext(DatePickerContext)
  const [selected, setSelected] = useState<DaySelection>(false)

  if (!value) {
    throw new Error('useDatePicker must be used inside a DatePickerProvider')
  }

  useEffect(() => {
    if (date) {
      if (value.hoverRange) {
        if (isRangeSelection(value.hoverRange)) {
          if (isEqual(date, value.hoverRange.from)) {
            setSelected('start')
          } else if (value.hoverRange.to && isEqual(date, value.hoverRange.to)) {
            setSelected('end')
          } else if (
            isAfter(date, value.hoverRange.from) &&
            value.hoverRange.to &&
            isBefore(date, value.hoverRange.to)
          ) {
            setSelected('middle')
          } else {
            setSelected(false)
          }
        }
      } else if (value.selection) {
        if (isMultiSelection(value.selection)) {
          setSelected(!!value.selection.find(d => isEqual(d, date)))
        } else if (isRangeSelection(value.selection)) {
          if (isEqual(date, value.selection.from)) {
            setSelected('start')
          } else if (value.selection.to && isEqual(date, value.selection.to)) {
            setSelected('end')
          } else if (isAfter(date, value.selection.from) && value.selection.to && isBefore(date, value.selection.to)) {
            setSelected('middle')
          } else {
            setSelected(false)
          }
        } else {
          setSelected(isEqual(date, value.selection))
        }
      }
    }
  }, [date, value.hoverRange, value.selection])

  let blocked,
    disabled = false

  if (date) {
    // Determine if date is blocked out
    if (value.configuration.blockedDates) {
      blocked = !!value.configuration.blockedDates.find(d => isEqual(d, date))
    }

    // Determine if date is disabled
    if (value.configuration.minDate || value.configuration.maxDate) {
      disabled =
        (value.configuration.minDate ? isBefore(date, value.configuration.minDate) : false) ||
        (value.configuration.maxDate ? isAfter(date, value.configuration.maxDate) : false)
    }
  }

  return {...value, blocked, disabled, selected}
}

export default useDatePicker

export interface DatePickerProviderProps {
  closePicker?: () => void
  configuration?: DatePickerConfiguration
  value?: Selection | StringSelection
}

export function isSingleSelection(selection: Selection): selection is Date {
  return selection instanceof Date
}

export function isMultiSelection(selection: Selection | StringSelection): selection is Array<Date> | Array<string> {
  return Array.isArray(selection)
}

export function isRangeSelection(
  selection: Selection | StringSelection
): selection is RangeSelection | StringRangeSelection {
  return !!(selection as RangeSelection).from
}

export function isStringRangeSelection(selection: StringSelection): selection is StringRangeSelection {
  return !!(selection as StringRangeSelection).from
}

function parseSelection(
  selection: Selection | StringSelection | null | undefined,
  variant: SelectionVariant
): Selection | undefined {
  if (!selection) return

  if (variant === 'multi') {
    if (isMultiSelection(selection)) {
      const parsedSelection: Array<Date> = []
      for (const d of selection) {
        parsedSelection.push(new Date(new Date(d).toDateString()))
      }
      return parsedSelection.sort((a, b) => a.getTime() - b.getTime())
    } else if (selection instanceof Date) {
      return [new Date(new Date(selection).toDateString())]
    } else if (isRangeSelection(selection)) {
      const parsedSelection: Array<Date> = []
      parsedSelection.push(new Date(new Date(selection.from).toDateString()))
      if (selection.to) {
        parsedSelection.push(new Date(new Date(selection.to).toDateString()))
      }
      return parsedSelection.sort((a, b) => a.getTime() - b.getTime())
    }
  } else if (variant === 'range') {
    if (isRangeSelection(selection)) {
      return {
        from: new Date(new Date(selection.from).toDateString()),
        to: selection.to ? new Date(new Date(selection.to).toDateString()) : null
      }
    } else if (isMultiSelection(selection)) {
      return {
        from: new Date(new Date(selection[0]).toDateString()),
        to: selection[1] ? new Date(new Date(selection[1]).toDateString()) : null
      }
    } else if (selection instanceof Date) {
      return {
        from: new Date(new Date(selection).toDateString()),
        to: null
      }
    }
  } else {
    if (selection instanceof Date) {
      return new Date(new Date(selection).toDateString())
    } else if (isMultiSelection(selection)) {
      return new Date(new Date(selection[0]).toDateString())
    } else if (isRangeSelection(selection)) {
      return new Date(new Date(selection.from).toDateString())
    } else {
      return
    }
  }
}

const defaultConfiguration: DatePickerConfiguration = {
  anchorVariant: 'button',
  confirmation: false,
  contiguousSelection: false,
  dimWeekends: false,
  placeholder: 'Select a Date...',
  selection: 'single',
  view: '2-month',
  weekStartsOn: 'Sunday'
}

export const DatePickerProvider: React.FC<DatePickerProviderProps> = ({
  configuration: externalConfig = {},
  children,
  closePicker,
  value
}) => {
  const [configuration, setConfiguration] = useState(deepmerge(defaultConfiguration, externalConfig))
  const [previousSelection, setPreviousSelection] = useState<Selection | undefined>(
    parseSelection(value, configuration.selection)
  )
  const [selection, setSelection] = useState<Selection | undefined>(parseSelection(value, configuration.selection))
  const [hoverRange, setHoverRange] = useState<RangeSelection | null>(null)
  const [currentViewingDate, setCurrentViewingDate] = useState(new Date())

  useEffect(() => {
    setConfiguration(deepmerge(defaultConfiguration, externalConfig))
    setSelection(parseSelection(selection, configuration.selection))

    // Don't want this to run every time selection gets updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuration.selection, externalConfig])

  const goToMonth = useCallback((date: Date) => {
    setCurrentViewingDate(new Date(new Date(date).toDateString()))
  }, [])

  const nextMonth = useCallback(() => {
    setCurrentViewingDate(addMonths(currentViewingDate, 1))
  }, [currentViewingDate])

  const previousMonth = useCallback(() => {
    setCurrentViewingDate(subMonths(currentViewingDate, 1))
  }, [currentViewingDate])

  const getFormattedDate = useMemo(() => {
    if (!selection) {
      return configuration.placeholder
    }

    let template = 'MMM d'
    if (configuration.dateFormat) {
      switch (configuration.dateFormat) {
        case 'short':
          template = 'MMM d'
          break
        case 'long':
          template = 'MMM d, yyyy'
          break
        default:
          template = configuration.dateFormat
          break
      }
    }

    switch (configuration.selection) {
      case 'single': {
        if (selection instanceof Date) {
          return format(selection, template)
        } else if (Array.isArray(selection)) {
          return format(selection[0], template)
        } else if (isRangeSelection(selection)) {
          return format(selection.from, template)
        } else {
          return 'Invalid Selection'
        }
      }
      case 'multi': {
        if (Array.isArray(selection)) {
          if (selection.length > 3) return `${selection.length} Selected`
          const formatted = selection.map(d => format(d, template)).join(', ')
          return formatted
        } else if (selection instanceof Date) {
          return [selection].map(d => format(d, template)).join(', ')
        } else if (isRangeSelection(selection)) {
          return [selection.to, selection.from].map(d => (d ? format(d, template) : '')).join(', ')
        } else {
          return 'Invalid Selection'
        }
      }
      case 'range': {
        if (isRangeSelection(selection)) {
          return Object.entries(selection)
            .map(([_, date]) => (date ? format(date, template) : ''))
            .join(' - ')
        } else if (selection instanceof Date) {
          return Object.entries({from: selection, to: null})
            .map(([_, date]) => (date ? format(date, template) : ''))
            .join(' - ')
        } else if (Array.isArray(selection)) {
          return (
            Object.entries({from: selection[0], to: selection[1]})
              // to date can still be null
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              .map(([_, date]) => (date ? format(date, template) : ''))
              .join(' - ')
          )
        } else {
          return 'Invalid Selection'
        }
      }
      default: {
        return 'Invalid Configuration'
      }
    }
  }, [configuration.dateFormat, configuration.placeholder, configuration.selection, selection])

  const saveValue = useCallback(
    (updatedSelection?: Selection) => {
      setPreviousSelection(updatedSelection ?? selection)
      closePicker?.()
    },
    [closePicker, selection]
  )

  const selectionHandler = useCallback(
    (date: Date) => {
      if (configuration.selection === 'multi') {
        const selections = [...(selection as Array<Date>)]
        const existingIndex = selections.findIndex((s: Date) => isEqual(s, date))
        if (existingIndex > -1) {
          selections.splice(existingIndex, 1)
          setSelection(selections.sort((a, b) => a.getTime() - b.getTime()))
        } else {
          setSelection([...selections, date].sort((a, b) => a.getTime() - b.getTime()))
        }
      } else if (configuration.selection === 'range') {
        if (selection && isRangeSelection(selection) && !selection.to) {
          const updatedSelection = isBefore(date, selection.from)
            ? {from: date, to: selection.from}
            : {from: selection.from, to: date}
          setSelection(updatedSelection)
          setHoverRange(null)
          if (!configuration.confirmation) {
            saveValue(updatedSelection)
          }
        } else {
          setHoverRange({from: date, to: date})
          setSelection({from: date, to: null})
        }
      } else {
        setSelection(date)

        if (!configuration.confirmation) {
          saveValue(date)
        }
      }
    },
    [configuration.confirmation, configuration.selection, saveValue, selection]
  )

  const focusHnadler = useCallback(
    (date: Date) => {
      if (!selection) return

      if (configuration.selection === 'range' && isRangeSelection(selection) && hoverRange) {
        setHoverRange(
          isBefore(date, selection.from) ? {from: date, to: selection.from} : {from: selection.from, to: date}
        )
      }
    },
    [configuration.selection, hoverRange, selection]
  )

  const blurHnadler = useCallback(
    (date: Date) => {
      if (!selection || !hoverRange) return

      if (
        configuration.selection === 'range' &&
        isRangeSelection(selection) &&
        (hoverRange.from === date || hoverRange.to === date)
      ) {
        // setHoverRange({from: hoverRange.from, to: hoverRange.from})
      }
    },
    [configuration.selection, hoverRange, selection]
  )

  const revertValue = useCallback(() => {
    setSelection(previousSelection)
  }, [previousSelection])

  const datePickerCtx: DatePickerContext = useMemo(() => {
    return {
      configuration,
      currentViewingDate,
      disabled: false,
      formattedDate: getFormattedDate,
      goToMonth,
      hoverRange,
      nextMonth,
      onDayBlur: blurHnadler,
      onDayFocus: focusHnadler,
      onSelection: selectionHandler,
      previousMonth,
      revertValue,
      saveValue,
      selectionActive: false,
      selection
    }
  }, [
    blurHnadler,
    configuration,
    currentViewingDate,
    focusHnadler,
    getFormattedDate,
    goToMonth,
    hoverRange,
    nextMonth,
    previousMonth,
    revertValue,
    saveValue,
    selection,
    selectionHandler
  ])

  return <DatePickerContext.Provider value={datePickerCtx}>{children}</DatePickerContext.Provider>
}
