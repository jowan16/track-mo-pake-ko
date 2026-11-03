
import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-3xl font-bold">
          Terms and Conditions
        </h1>

        <p className="mb-6 text-sm text-gray-500">
          Last updated: November 1, 2026
        </p>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            1. Acceptance of Terms
          </h2>
          <p className="text-gray-700">
            By creating an account and using Track Mo, Pake Ko!, you agree
            to follow these Terms and Conditions.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            2. Purpose of the Application
          </h2>
          <p className="text-gray-700">
            Track Mo, Pake Ko! is an educational expense-tracking and
            budgeting application designed to help users monitor their
            expenses, manage budgets, and improve their financial literacy.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            3. User Responsibilities
          </h2>
          <p className="text-gray-700">
            Users are responsible for providing accurate account information,
            keeping their login credentials secure, and using the application
            appropriately.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            4. Account Security
          </h2>
          <p className="text-gray-700">
            Users should not share their passwords or allow unauthorized
            individuals to access their accounts.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            5. Proper Use of the Application
          </h2>
          <p className="text-gray-700">
            Users must not attempt to access another person's account,
            disrupt the application, or misuse its features.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            6. Changes to These Terms
          </h2>
          <p className="text-gray-700">
            These Terms and Conditions may be updated when necessary.
            Users should review this page for changes.
          </p>
        </section>

        <Link
          to="/signup"
          className="font-medium text-brand underline"
        >
          Back to Sign Up
        </Link>
      </div>
    </div>
  )
}
