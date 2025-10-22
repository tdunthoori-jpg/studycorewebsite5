import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-950 to-blue-900 text-white">
      <header className="border-b border-sky-700/50 backdrop-blur-sm bg-sky-950/80">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl">StudyCore</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/login" className="text-sm hover:text-sky-300 transition-colors">
              Sign In
            </Link>
            <Button asChild className="bg-gradient-to-r from-sky-500 to-indigo-500">
              <Link to="/register">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>
      
      <main className="flex-grow flex items-center">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-sky-300">
              Welcome to StudyCore Portal
            </h1>
            <p className="text-xl text-sky-100">
              Access your personalized learning space, connect with tutors, and track your progress.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button asChild size="lg" className="bg-gradient-to-r from-sky-500 to-indigo-500">
                <Link to="/register">Create Account</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-sky-300 border-sky-300">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="border-t border-sky-700/50">
        <div className="container mx-auto p-6 text-center text-sky-100/70 text-sm">
          <p>© {new Date().getFullYear()} StudyCore. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}