// Habit Arena — icon system. Maps a habit label to a lucide-react icon so
// custom habits automatically get a fitting icon, with a picker fallback.
import {
  Moon, Droplet, Dumbbell, Book, BookOpen, Sun, Brush, ShowerHead,
  Salad, Smartphone, Flower2, Trash2, PenLine, Utensils, Footprints,
  Heart, Sparkles, Coffee, Bed, Check,
} from 'lucide-react'

// key -> icon component. Keys are what we store in the DB (habits.icon).
export const ICONS = {
  moon: Moon, droplet: Droplet, dumbbell: Dumbbell, book: Book,
  'book-open': BookOpen, sun: Sun, brush: Brush, shower: ShowerHead,
  salad: Salad, phone: Smartphone, flower: Flower2, broom: Trash2,
  pen: PenLine, utensils: Utensils, footprints: Footprints, heart: Heart,
  sparkles: Sparkles, coffee: Coffee, bed: Bed, check: Check,
}

// keyword (regex) -> icon key. First match wins.
const KEYWORD_MAP = [
  [/sleep|bed|nap/i, 'moon'],
  [/water|hydrat|drink/i, 'droplet'],
  [/exercise|workout|gym|run|jog|move|walk/i, 'dumbbell'],
  [/journal|diary|write/i, 'pen'],
  [/read|book|study/i, 'book-open'],
  [/wake|early|morning/i, 'sun'],
  [/brush|teeth|floss/i, 'brush'],
  [/shower|bath|bathe/i, 'shower'],
  [/eat|healthy|junk|diet|meal/i, 'salad'],
  [/scroll|phone|screen|social/i, 'phone'],
  [/meditat|breath|calm|yoga/i, 'flower'],
  [/tidy|clean|chore|dish/i, 'broom'],
  [/coffee|caffeine/i, 'coffee'],
  [/food|cook|snack/i, 'utensils'],
  [/step|stretch/i, 'footprints'],
]

// Best icon key for a free-text habit label. Falls back to a generic check.
export function iconKeyFor(label = '') {
  for (const [re, key] of KEYWORD_MAP) if (re.test(label)) return key
  return 'check'
}

// Resolve a stored icon key to a component (safe fallback if unknown).
export function iconComponent(key) {
  return ICONS[key] || ICONS.check
}

// Ordered keys for the icon picker UI.
export const ICON_CHOICES = Object.keys(ICONS)

// A palette of accent colors for habit cards (user can pick).
export const HABIT_COLORS = [
  '#7c6cff', '#f59e0b', '#10b981', '#ef4444', '#06b6d4',
  '#ec4899', '#8b5cf6', '#f97316', '#22c55e', '#3b82f6',
]
