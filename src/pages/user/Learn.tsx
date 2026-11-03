
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Lightbulb } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TOPICS, TopicIcon } from '../../lib/icons'
import { PageLoader } from '../../components/ui'
import type { Lesson as LessonRow } from '../../lib/types'

const NOTE = (
  <p className="text-xs text-muted">
    For education only. This is not financial advice.
  </p>
)

// Card titles and descriptions shown on the Learn the Basics page.
const HUB_TEXT: Record<string, { title: string; desc: string }> = {
  budgeting: {
    title: 'Budgeting Tips',
    desc: 'Learn how to plan your income and control your expenses.',
  },
  saving: {
    title: 'Saving Strategies',
    desc: 'Build a saving habit and prepare for future needs.',
  },
  investing: {
    title: 'Introduction to Investing',
    desc: 'Understand how investing can help grow your money over time.',
  },
  borrowing: {
    title: 'Managing Loans and Debt',
    desc: 'Learn how to borrow responsibly and manage repayments.',
  },
  insurance: {
    title: 'Insurance Basics',
    desc: 'Learn how insurance protects your savings from big surprises.',
  },
  safety: {
    title: 'Financial Safety',
    desc: 'Learn how to spot scams and keep your money and accounts safe.',
  },
}

// Official financial education resources for each topic.
const READ_MORE_LINKS: Record<string, string> = {
  budgeting:
    'https://filiapp.treasury.gov.ph/budgeting.html',

  saving:
    'https://www.bsp.gov.ph/Pages/InclusiveFinance/FinancialEducationLearningModules.aspx',

  investing:
    'https://appointment.sec.gov.ph/investors-education-and-information/investment-101/',

  borrowing:
    'https://www.bsp.gov.ph/Pages/InclusiveFinance/FinancialEducationLearningModules.aspx',

  insurance:
    'https://www.insurance.gov.ph/',

  safety:
    'https://www.bsp.gov.ph/Pages/InclusiveFinance/FinEdConsumerProtectionCampaigns1.aspx',
}

function useLessons() {
  return useQuery({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .order('sort_order')

      if (error) throw error

      return data as LessonRow[]
    },
  })
}

export function LearnHub() {
  const lessons = useLessons()

  if (lessons.isLoading) return <PageLoader />

  if (lessons.error) {
    return (
      <div className="banner banner-error" role="alert">
        Unable to load financial literacy lessons. Please try again.
      </div>
    )
  }

  const all = lessons.data ?? []

  return (
    <>
      {/* PAGE TITLE */}
      <header>
        <h1 className="text-[26px] font-bold leading-tight">
          Financial Literacy
        </h1>

        <p className="mt-1 text-sm text-muted">
          Learn practical ways to manage, save, and grow your money.
        </p>
      </header>

      {/* INTRO BANNER */}
      <section
        className="flex items-start gap-4 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 p-4"
        aria-label="Introduction"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
          <Lightbulb size={22} aria-hidden />
        </span>

        <div>
          <h2 className="text-lg font-bold leading-tight">
            Make Better Financial Decisions
          </h2>

          <p className="mt-1 text-sm text-muted">
            Managing money is an important life skill. Explore these learning
            topics to understand budgeting, saving, investing, debt management,
            and other financial concepts.
          </p>
        </div>
      </section>

      {/* SECTION TITLE */}
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <BookOpen size={20} aria-hidden />
        Learn the Basics
      </h2>

      {/* TOPIC CARDS */}
      <section className="grid gap-4 md:grid-cols-2">
        {TOPICS.map((t) => {
          const ls = all.filter((l) => l.topic === t.key)
          const text = HUB_TEXT[t.key] ?? {
            title: t.name,
            desc: t.insight,
          }
          const Icon = t.icon

          const inner = (
            <>
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: t.bg, color: t.color }}
              >
                <Icon size={22} aria-hidden />
              </span>

              <h3 className="mt-4 text-base font-bold">
                {text.title}
              </h3>

              <p className="mt-2 text-sm text-muted">
                {text.desc}
              </p>

              <p className="mt-4 text-sm font-medium text-[var(--accent)]">
                {ls.length > 0
                  ? 'Click to learn more'
                  : 'Lessons for this topic are coming soon.'}
              </p>
            </>
          )

          const base =
            'flex flex-col rounded-xl border bg-white p-5 transition'

          return ls.length > 0 ? (
            <Link
              key={t.key}
              to={`/app/learn/${ls[0].id}`}
              className={`${base} border-line hover:border-[var(--accent)]/50 hover:shadow-sm focus-visible:border-[var(--accent)]/50`}
            >
              {inner}
            </Link>
          ) : (
            <div
              key={t.key}
              className={`${base} border-line opacity-80`}
            >
              {inner}
            </div>
          )
        })}
      </section>

      {NOTE}
    </>
  )
}

// Formats lesson content into headings, paragraphs, and lists.
function Body({ text }: { text: string }) {
  const blocks: ReactNode[] = text
    .split(/\n\s*\n/)
    .filter((block) => block.trim())
    .map((block, i) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      const firstLine = lines[0]

      // Supports both Markdown headings and existing plain-text headings.
      const cleanFirstLine = firstLine.replace(/^#{1,6}\s+/, '')

      const isHeading =
        firstLine.startsWith('#') ||
        cleanFirstLine.endsWith(':') ||
        /^(what is .+\??|what is it\??|budgeting 101|why is budgeting important\??|questions to ask yourself|example:.*|needs vs\. wants|needs|wants|reminder:?|helpful tips|tools and requirements for budgeting|make a budget in 5 steps!?|step \d+:.*|important budgeting reminders|final takeaway|source and further reading|key takeaways)$/i.test(
          cleanFirstLine,
        )

      const head = isHeading
        ? cleanFirstLine.replace(/:$/, '')
        : null

      const rest = head ? lines.slice(1) : lines

      const ordered =
        rest.length > 0 &&
        rest.every((line) => /^\d+\.\s/.test(line))

      const bullets =
        rest.length > 0 &&
        rest.every((line) => /^[-•]\s/.test(line))

      const list = ordered ? (
        <ol className="list-decimal space-y-1 pl-5 text-[15px] leading-8">
          {rest.map((line, index) => (
            <li key={index}>
              {line.replace(/^\d+\.\s/, '')}
            </li>
          ))}
        </ol>
      ) : bullets ? (
        <ul className="list-disc space-y-1 pl-5 text-[15px] leading-8">
          {rest.map((line, index) => (
            <li key={index}>{line.replace(/^[-•]\s/, '')}</li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] leading-7">
          {rest.join(' ')}
        </p>
      )

      if (head?.toLowerCase() === 'key takeaways') {
        return (
          <div
            key={i}
            className="rounded-xl bg-[#e6f4f1] p-4"
          >
            <b className="text-sm">{head}</b>

            <div className="mt-2">
              {list}
            </div>
          </div>
        )
      }

      const isStep = /^step \d+:/i.test(head ?? '')

      return (
        <div
          key={i}
          className={isStep ? 'rounded-lg bg-gray-50 p-4' : ''}
        >
          {head && (
            <h3 className="mb-2 text-[17px] font-bold">
              {head}
            </h3>
          )}

          {list}
        </div>
      )
    })

  return (
    <div className="flex flex-col gap-4">
      {blocks}
    </div>
  )
}

export function Lesson() {
  const { id } = useParams()
  const lessons = useLessons()

  if (lessons.isLoading) return <PageLoader />

  if (lessons.error) {
    return (
      <div className="banner banner-error" role="alert">
        Unable to load this lesson. Please try again.
      </div>
    )
  }

  const all = lessons.data ?? []
  const lesson = all.find((l) => l.id === Number(id))

  if (!lesson) {
    return (
      <div className="flex flex-col items-start gap-3">
        <div className="banner banner-warn" role="alert">
          This lesson is no longer available.
        </div>

        <Link to="/app/learn" className="btn">
          Back to all topics
        </Link>
      </div>
    )
  }

  const topic = TOPICS.find((t) => t.key === lesson.topic)

  if (!topic) {
    return (
      <div className="flex flex-col items-start gap-3">
        <div className="banner banner-warn" role="alert">
          The topic for this lesson could not be found.
        </div>

        <Link to="/app/learn" className="btn">
          Back to all topics
        </Link>
      </div>
    )
  }

  const readMoreUrl = READ_MORE_LINKS[topic.key]

  return (
    <>
      {/* BREADCRUMB */}
      <nav
        aria-label="Breadcrumb"
        className="text-[13px] text-muted"
      >
        <Link
          to="/app/learn"
          className="text-brand underline"
        >
          Financial Literacy
        </Link>

        {' / '}

        {topic.name}

        {' / '}

        {lesson.title}
      </nav>

      {/* LESSON CONTENT */}
      <section>
        <article className="card flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <TopicIcon topic={topic} size={48} />

            <h1 className="text-[26px] font-bold">
              {lesson.title}
            </h1>
          </div>

          <Body text={lesson.body} />

          {/* LESSON ACTIONS */}
          <div className="flex flex-wrap gap-2.5 border-t border-line pt-4">
          
            {readMoreUrl && (
              <a
                href={readMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Read More
              </a>
            )}
          </div>
        </article>
      </section>

      {NOTE}
    </>
  )
}
