import '../styles/NotFoundPage.css'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button.jsx'

export default function NotFoundPage() {
  return (
    <div className="nl-notfound nl-animate-fade-up">
      <div className="nl-notfound-code">404</div>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist or was moved.</p>
      <Button as={Link} to="/" variant="primary" size="md">
        ← Back to Dashboard
      </Button>
    </div>
  )
}
