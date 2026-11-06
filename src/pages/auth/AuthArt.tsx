
import { PiggyBank, Target, Wallet } from 'lucide-react'

export function AuthArt() {
  return (
    <div
      className="relative flex w-full max-w-[560px] items-center justify-center"
      aria-label="Illustration of personal finance tracking"
      role="img"
    >
      {/* Decorative background circles */}
      <div className="absolute h-[390px] w-[390px] rounded-full border border-white/10 bg-white/[0.03]" />
      <div className="absolute h-[310px] w-[310px] rounded-full border border-white/10" />
      <div className="absolute h-[230px] w-[230px] rounded-full bg-teal-400/10 blur-2xl" />

      {/* Main dashboard illustration */}
      <div className="relative z-10 w-full max-w-[440px] rotate-[-2deg] rounded-3xl border border-white/15 bg-[#12352d]/95 p-5 shadow-2xl shadow-black/30">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-teal-200/70">
              PERSONAL FINANCE
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              Your money overview
            </h2>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-300/15 text-teal-200">
            <Wallet size={21} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <p className="text-sm text-[#c9d8d3]">
            Available balance
          </p>

          <p className="mt-1 text-3xl font-bold text-white">
            ₱12,450.00
          </p>

          <div className="mt-4 flex items-end gap-2">
            {[35, 55, 42, 75, 48, 88, 64, 95, 58, 78, 52, 85].map(
              (height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-teal-600 to-teal-300"
                  style={{ height: `${height}px` }}
                />
              ),
            )}
          </div>

          <div className="mt-2 flex justify-between text-[10px] text-white/50">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center gap-2 text-teal-200">
              <Target size={17} />
              <span className="text-xs">Monthly budget</span>
            </div>

            <p className="mt-3 text-xl font-bold text-white">
              ₱8,000
            </p>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[65%] rounded-full bg-teal-300" />
            </div>

            <p className="mt-2 text-[10px] text-white/50">
              65% used
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center gap-2 text-amber-200">
              <PiggyBank size={17} />
              <span className="text-xs">Savings goal</span>
            </div>

            <p className="mt-3 text-xl font-bold text-white">
              ₱5,000
            </p>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[80%] rounded-full bg-amber-300" />
            </div>

            <p className="mt-2 text-[10px] text-white/50">
              80% achieved
            </p>
          </div>
        </div>
      </div>

      {/* Floating decorative icons */}
      <div className="absolute -right-2 top-10 z-20 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-[#174b3d] text-teal-200 shadow-xl">
        <PiggyBank size={28} />
      </div>

      <div className="absolute -bottom-5 -left-3 z-20 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-[#174b3d] text-amber-200 shadow-xl">
        <Target size={23} />
      </div>
    </div>
  )
}
