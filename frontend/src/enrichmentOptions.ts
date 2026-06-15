export const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Swing', label: 'Swing' },
  { value: 'Trampoline', label: 'Trampoline' },
  { value: 'Slide', label: 'Slide' },
  { value: 'ClimbingFrame', label: 'Climbing frame' },
  { value: 'Sandpit', label: 'Sandpit' },
  { value: 'Springy', label: 'Springy rider' },
  { value: 'Roundabout', label: 'Roundabout' },
]

export const AGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Toddlers', label: 'Toddlers' },
  { value: 'YoungChildren', label: 'Young children' },
  { value: 'OlderChildren', label: 'Older children' },
]

export const SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Small', label: 'Small' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Large', label: 'Large' },
]

export const FLAG_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'PermanentlyClosed', label: 'Permanently closed / removed' },
  { value: 'TemporarilyClosed', label: 'Temporarily closed' },
  { value: 'NoLongerMaintained', label: 'No longer maintained (equipment removed or unusable)' },
  { value: 'Other', label: 'Other' },
]

export const EQUIPMENT_LABELS: Record<string, string> = Object.fromEntries(
  EQUIPMENT_OPTIONS.map(({ value, label }) => [value, label])
)
export const AGE_LABELS: Record<string, string> = Object.fromEntries(
  AGE_OPTIONS.map(({ value, label }) => [value, label])
)
export const SIZE_LABELS: Record<string, string> = Object.fromEntries(
  SIZE_OPTIONS.map(({ value, label }) => [value, label])
)
export const FLAG_REASON_LABELS: Record<string, string> = Object.fromEntries(
  FLAG_REASON_OPTIONS.map(({ value, label }) => [value, label])
)
