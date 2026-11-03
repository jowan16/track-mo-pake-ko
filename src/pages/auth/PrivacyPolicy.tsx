
import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-3xl font-bold">
          Privacy Policy
        </h1>

        <p className="mb-6 text-sm text-gray-500">
          Last updated: November 1, 2026
        </p>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            1. Information We Collect
          </h2>
          <p className="text-gray-700">
            Track Mo, Pake Ko! may collect information such as your name,
            email address, expense records, and budget information when
            you use the application.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            2. How We Use Your Information
          </h2>
          <p className="text-gray-700">
            Your information is used to provide account access, track
            expenses, manage budgets, generate reports, and support the
            application's financial literacy features.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            3. Data Storage
          </h2>
          <p className="text-gray-700">
            Information submitted through the application is stored using
            its configured backend services. Access should be restricted
            according to the application's security settings.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            4. Data Protection
          </h2>
          <p className="text-gray-700">
            We aim to protect user information through appropriate security
            measures. Users should also keep their account credentials private.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            5. Sharing of Information
          </h2>
          <p className="text-gray-700">
            Personal information should not be shared with unauthorized
            parties. Information may be processed by service providers
            necessary to operate the application.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">
            6. Privacy Policy Updates
          </h2>
          <p className="text-gray-700">
            This Privacy Policy may be updated when the application's
            data practices or requirements change.
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
