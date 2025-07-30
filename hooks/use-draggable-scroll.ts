"use client"

import type React from "react"

import { useRef, useState, useCallback, useEffect } from "react"

/**
 * A custom React hook to enable horizontal "click and drag to scroll" functionality.
 *
 * @template T The type of the HTML element that will be scrollable (defaults to HTMLDivElement).
 * @param {boolean} disabled - If true, the draggable scroll functionality will be disabled.
 * @returns An object containing:
 *   - `scrollRef`: A React ref to be attached to the scrollable HTML element.
 *   - `onMouseDown`: An event handler to be attached to the `onMouseDown` event of the scrollable element.
 *   - `isDragging`: A boolean indicating whether the user is currently dragging to scroll.
 */
export function useDraggableScroll<T extends HTMLElement = HTMLDivElement>(disabled = false) {
  const scrollRef = useRef<T>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent<T>) => {
      if (disabled) {
        return // Do not activate if disabled (e.g., dnd-kit is active)
      }

      setIsDragging(true)
      setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0))
      setScrollLeft(scrollRef.current?.scrollLeft || 0)
      e.preventDefault() // Prevent default browser drag behavior (e.g., text selection)
    },
    [disabled],
  )

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !scrollRef.current) return
      e.preventDefault() // Prevent default browser drag behavior during scroll
      const x = e.pageX - (scrollRef.current.offsetLeft || 0)
      const walk = (x - startX) * 1 // Calculate the distance moved. Adjust multiplier for scroll speed.
      scrollRef.current.scrollLeft = scrollLeft - walk // Apply the scroll
    },
    [isDragging, startX, scrollLeft],
  )

  const onMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Attach and clean up global mouse event listeners to ensure scrolling continues
  // even if the mouse leaves the scrollable element during a drag.
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  return { scrollRef, onMouseDown, isDragging }
}
