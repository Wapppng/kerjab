"use client"

import { type ReactNode, useState, useRef, useEffect, useCallback } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NotionSelectOption {
  value: string
  label: string
  prefix?: ReactNode
  optionClassName?: string
}

interface NotionSelectProps {
  value: string
  onChange: (value: string) => void
  options: NotionSelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function NotionSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  disabled,
  className,
}: NotionSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [focusedIdx, setFocusedIdx] = useState(-1)

  const selected = options.find((o) => o.value === value)

  const handleClose = useCallback(() => {
    setOpen(false)
    setFocusedIdx(-1)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [handleClose])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault()
        setOpen(true)
        setFocusedIdx(0)
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setFocusedIdx((prev) => (prev < options.length - 1 ? prev + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setFocusedIdx((prev) => (prev > 0 ? prev - 1 : options.length - 1))
        break
      case "Enter":
      case " ":
        e.preventDefault()
        if (focusedIdx >= 0 && focusedIdx < options.length) {
          onChange(options[focusedIdx].value)
          handleClose()
        }
        break
      case "Escape":
        e.preventDefault()
        handleClose()
        break
    }
  }

  useEffect(() => {
    if (open && listRef.current && focusedIdx >= 0) {
      const item = listRef.current.children[focusedIdx] as HTMLElement
      item?.scrollIntoView({ block: "nearest" })
    }
  }, [focusedIdx, open])

  return (
    <div ref={ref} className={cn("relative", className)} onKeyDown={handleKeyDown}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex w-full items-center justify-between rounded border border-[#e5e5e5] px-2.5 py-1.5 text-sm outline-none transition-[border-color] duration-150",
          "focus:border-[#0b6bff] focus:shadow-[0_0_0_1px_#0b6bff]",
          !selected && "text-neutral-400",
          selected?.optionClassName,
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {selected?.prefix}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <ChevronDown
          className={cn(
            "ml-1 h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded border border-[#e5e5e5] bg-white shadow-lg"
        >
          {options.map((option, idx) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={cn(
                "flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm transition-colors duration-100",
                idx === focusedIdx ? "bg-neutral-100" : "hover:bg-neutral-100",
                option.value === value && "font-medium"
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(option.value)
                handleClose()
              }}
              onMouseEnter={() => setFocusedIdx(idx)}
            >
              {option.prefix}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
