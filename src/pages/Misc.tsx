import { Link } from 'react-router-dom'

export function Forbidden() {
  return (
    <div className="mx-auto max-w-md p-10">
      <h1 className="mb-3 text-2xl font-bold">Access denied (403)</h1>
      <div className="banner banner-warn" role="alert">You do not have permission to view this page.</div>
      <Link to="/app" className="btn mt-4">Back to dashboard</Link>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-md p-10">
      <h1 className="mb-3 text-2xl font-bold">Page not found (404)</h1>
      <div className="banner banner-warn" role="alert">We could not find that page.</div>
      <Link to="/app" className="btn mt-4">Go to dashboard</Link>
    </div>
  )
}
