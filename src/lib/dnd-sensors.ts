import { PointerSensor } from '@dnd-kit/core'

/**
 * Extends PointerSensor to ignore elements (and their ancestors) that carry
 * `data-no-dnd="true"`, preventing accidental drag starts from buttons, inputs,
 * dropdowns, and other interactive children inside a draggable card.
 *
 * Defined in its own module so Next.js Fast Refresh never creates a new class
 * reference on hot-reload, which would otherwise cause React to see a different
 * number of hooks between renders (useSensor/useSensors both call useMemo).
 */
export class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: { nativeEvent: PointerEvent }) => {
        let el = nativeEvent.target as HTMLElement | null
        while (el) {
          if (el.dataset.noDnd) return false
          el = el.parentElement
        }
        return true
      },
    },
  ]
}
