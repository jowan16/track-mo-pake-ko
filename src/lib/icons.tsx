
import type { ComponentType, CSSProperties } from 'react'
import {
  ArrowLeftRight,
  Bus,
  Coins,
  House,
  PieChart,
  PiggyBank,
  Play,
  ShieldCheck,
  ShoppingBag,
  SquarePlus,
  TrendingUp,
  Umbrella,
  Utensils,
  Zap,
} from 'lucide-react'
import type { Category } from './types'

type IconCmp = ComponentType<{
  size?: number
  strokeWidth?: number
  style?: CSSProperties
  'aria-hidden'?: boolean
}>

/** Icon keys stored in categories.icon. Admins pick from these. */
export const CATEGORY_ICONS: Record<string, IconCmp> = {
  bus: Bus,
  'plus-square': SquarePlus,
  utensils: Utensils,
  zap: Zap,
  play: Play,
  'shopping-bag': ShoppingBag,
  home: House,
  coins: Coins,
  'piggy-bank': PiggyBank,
}

export const TOPICS = [
  {
    key: 'budgeting',
    name: 'Budgeting',
    insight: 'Give every peso a job before the month starts.',
    icon: PieChart,
    color: '#0F766E',
    bg: '#DDF1EE',
  },
  {
    key: 'saving',
    name: 'Saving',
    insight: 'Pay yourself first: set money aside before spending.',
    icon: PiggyBank,
    color: '#B45309',
    bg: '#FDECD2',
  },
  {
    key: 'borrowing',
    name: 'Borrowing',
    insight: 'Know the full cost before you borrow.',
    icon: ArrowLeftRight,
    color: '#1E3A5F',
    bg: '#E1E9F4',
  },
  {
    key: 'investing',
    name: 'Investing',
    insight: 'Start with your goals and time, not tips.',
    icon: TrendingUp,
    color: '#6D28D9',
    bg: '#EDE5FB',
  },
  {
    key: 'insurance',
    name: 'Insurance',
    insight: 'Insurance protects your savings from big surprises.',
    icon: Umbrella,
    color: '#BE185D',
    bg: '#FCE4EE',
  },
  {
    key: 'safety',
    name: 'Financial safety',
    insight: 'Never share your OTP or password with anyone.',
    icon: ShieldCheck,
    color: '#B42318',
    bg: '#FDE8E6',
  },
] as const

export type Topic = (typeof TOPICS)[number]

interface ChipProps {
  color: string
  bg: string
  size?: number
  children: (px: number) => React.ReactNode
  label: string
  ring?: boolean
}

export function Chip({
  color,
  bg,
  size = 40,
  children,
  label,
  ring,
}: ChipProps) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: bg,
        color,
        boxShadow: ring ? `0 0 0 3px ${color}` : undefined,
      }}
    >
      {children(Math.round(size * 0.5))}
    </span>
  )
}

export function CategoryIcon({
  category,
  size = 40,
  ring,
}: {
  category: Pick<Category, 'name' | 'icon' | 'color' | 'bg'>
  size?: number
  ring?: boolean
}) {
  const Icon = CATEGORY_ICONS[category.icon] ?? Coins

  return (
    <Chip
      color={category.color}
      bg={category.bg}
      size={size}
      label={category.name}
      ring={ring}
    >
      {(px) => <Icon size={px} strokeWidth={2} aria-hidden />}
    </Chip>
  )
}

export function TopicIcon({
  topic,
  size = 40,
}: {
  topic: Topic
  size?: number
}) {
  const Icon = topic.icon

  return (
    <Chip
      color={topic.color}
      bg={topic.bg}
      size={size}
      label={topic.name}
    >
      {(px) => <Icon size={px} strokeWidth={2} aria-hidden />}
    </Chip>
  )
}
