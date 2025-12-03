import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { SummaryPage } from './pages/SummaryPage';
import { LinearPage } from './pages/LinearPage';
import { GitHubPage } from './pages/GitHubPage';
import { SentimentPage } from './pages/SentimentPage';
import { EntitiesPage } from './pages/EntitiesPage';
import { ClassificationPage } from './pages/ClassificationPage';
import { TranslationPage } from './pages/TranslationPage';
import { ModerationPage } from './pages/ModerationPage';

export function App() {
	return (
		<div className="container">
			<header>
				<h1>Agent API Playground</h1>
				<nav className="nav">
					<Link className="nav-link" to="/summary">Summary agent</Link>
					<Link className="nav-link" to="/linear">Linear agent</Link>
					<Link className="nav-link" to="/github">GitHub agent</Link>
					<Link className="nav-link" to="/sentiment">Sentiment analysis</Link>
					<Link className="nav-link" to="/entities">Named Entity Recognizer</Link>
					<Link className="nav-link" to="/classification">Classification</Link>
					<Link className="nav-link" to="/translation">Translation</Link>
					<Link className="nav-link" to="/moderation">Moderation</Link>
				</nav>
			</header>
			<Routes>
				<Route path="/" element={<Navigate to="/summary" replace />} />
				<Route path="/summary" element={<SummaryPage />} />
				<Route path="/linear" element={<LinearPage />} />
				<Route path="/github" element={<GitHubPage />} />
				<Route path="/sentiment" element={<SentimentPage />} />
				<Route path="/entities" element={<EntitiesPage />} />
				<Route path="/classification" element={<ClassificationPage />} />
				<Route path="/translation" element={<TranslationPage />} />
				<Route path="/moderation" element={<ModerationPage />} />
			</Routes>
		</div>
	);
}
