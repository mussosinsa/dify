'use client'

import {
  AcademicCapIcon,
  BeakerIcon,
  BookmarkSquareIcon,
  ChartBarSquareIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PhotoIcon,
  PlusIcon,
  SparklesIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

const iconWrapperClass = 'flex h-10 w-10 items-center justify-center rounded-2xl'

const Home = () => {
  const { t } = useTranslation()
  const categories = t('common.home.categories', { returnObjects: true }) as string[]
  const cards = [
    {
      key: 'agenda',
      title: t('common.home.cards.agenda.title'),
      details: t('common.home.cards.agenda.details', { returnObjects: true }) as string[],
      badge: t('common.home.cards.agenda.badge'),
      icon: SparklesIcon,
      accent: 'bg-indigo-50 text-indigo-600',
    },
    {
      key: 'resume',
      title: t('common.home.cards.resume.title'),
      details: t('common.home.cards.resume.details', { returnObjects: true }) as string[],
      badge: t('common.home.cards.resume.badge'),
      icon: ChartBarSquareIcon,
      accent: 'bg-sky-50 text-sky-600',
    },
    {
      key: 'sms',
      title: t('common.home.cards.sms.title'),
      details: t('common.home.cards.sms.details', { returnObjects: true }) as string[],
      badge: t('common.home.cards.sms.badge'),
      icon: ChatBubbleOvalLeftEllipsisIcon,
      accent: 'bg-amber-50 text-amber-600',
    },
    {
      key: 'travel',
      title: t('common.home.cards.travel.title'),
      details: t('common.home.cards.travel.details', { returnObjects: true }) as string[],
      badge: t('common.home.cards.travel.badge'),
      icon: AcademicCapIcon,
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      key: 'news',
      title: t('common.home.cards.news.title'),
      details: t('common.home.cards.news.details', { returnObjects: true }) as string[],
      badge: t('common.home.cards.news.badge'),
      icon: BeakerIcon,
      accent: 'bg-cyan-50 text-cyan-600',
    },
    {
      key: 'portfolio',
      title: t('common.home.cards.portfolio.title'),
      details: t('common.home.cards.portfolio.details', { returnObjects: true }) as string[],
      badge: t('common.home.cards.portfolio.badge'),
      icon: PhotoIcon,
      accent: 'bg-rose-50 text-rose-500',
    },
    {
      key: 'problem',
      title: t('common.home.cards.problem.title'),
      details: t('common.home.cards.problem.details', { returnObjects: true }) as string[],
      badge: t('common.home.cards.problem.badge'),
      icon: PaperClipIcon,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      key: 'gpt',
      title: t('common.home.cards.gpt.title'),
      details: t('common.home.cards.gpt.details', { returnObjects: true }) as string[],
      badge: t('common.home.cards.gpt.badge'),
      icon: BookmarkSquareIcon,
      accent: 'bg-lime-50 text-lime-700',
    },
  ]

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 pb-10 pt-8 lg:px-10">
        <header className="flex items-center justify-between rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 ring-1 ring-indigo-100" />
            <span className="text-base font-medium text-slate-500">Dify</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <SparklesIcon className="h-5 w-5" />
            <Squares2X2Icon className="h-5 w-5" />
          </div>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row">
          <main className="flex-1 space-y-6">
            <section className="rounded-3xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
              <div className="space-y-2 text-center lg:text-left">
                <p className="text-3xl font-semibold text-slate-800 lg:text-4xl">{t('common.home.greeting', { name: 'User' })}</p>
                <p className="text-lg text-slate-500">{t('common.home.subtitle')}</p>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                {categories?.map(category => (
                  <button
                    key={category}
                    className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-200"
                    type="button"
                  >
                    <Squares2X2Icon className="h-5 w-5" />
                    {category}
                  </button>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cards.map(card => (
                  <div
                    key={card.key}
                    className="group relative flex flex-col gap-4 rounded-2xl bg-white/60 p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:ring-indigo-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${iconWrapperClass} ${card.accent}`}>
                        <card.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
                        <ul className="space-y-1 text-sm text-slate-600">
                          {card.details.map(detail => (
                            <li key={detail} className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <span className="self-end rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{card.badge}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow">
                  <Squares2X2Icon className="h-6 w-6 text-indigo-500" />
                  <input
                    aria-label={t('common.home.inputPlaceholder')}
                    className="flex-1 border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    placeholder={t('common.home.inputPlaceholder')}
                    type="text"
                  />
                  <div className="flex items-center gap-3 text-slate-400">
                    <PaperClipIcon className="h-5 w-5" />
                    <PhotoIcon className="h-5 w-5" />
                    <MicrophoneIcon className="h-5 w-5" />
                  </div>
                  <button
                    className="flex items-center gap-1 rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
                    type="button"
                  >
                    {t('common.operation.send')}
                    <PaperAirplaneIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </main>

          <aside className="w-full shrink-0 space-y-4 lg:w-[320px]">
            <div className="sticky top-8 space-y-4 rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-slate-100">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-600 transition hover:-translate-y-0.5 hover:bg-indigo-100"
                type="button"
              >
                <PlusIcon className="h-5 w-5" />
                {t('common.home.actions.newChat')}
              </button>
              <button
                className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-indigo-200"
                type="button"
              >
                <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />
                {t('common.home.actions.myChats')}
              </button>

              <div className="relative mt-2">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  aria-label={t('common.home.actions.searchPlaceholder')}
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-200 focus:outline-none"
                  placeholder={t('common.home.actions.searchPlaceholder')}
                  type="text"
                />
              </div>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-left">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <BookmarkSquareIcon className="h-6 w-6 text-indigo-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">{t('common.home.actions.pinnedTitle')}</p>
                    <p className="text-xs text-slate-500">{t('common.home.actions.pinnedEmpty')}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default Home
