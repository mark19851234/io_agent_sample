import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { SummaryPage } from './pages/SummaryPage';
import { LinearPage } from './pages/LinearPage';
import { SentimentPage } from './pages/SentimentPage';

export function App() {
	return (
		<div className="container">
			<header>
				<h1>Agent Samples</h1>
				<p>React + Vite demo calling your agents via a secure dev proxy.</p>
				<nav className="nav">
					<Link className="nav-link" to="/summary">Summary agent</Link>
					<Link className="nav-link" to="/linear">Linear agent</Link>
					<Link className="nav-link" to="/sentiment">Sentiment analysis</Link>
				</nav>
			</header>
			<Routes>
				<Route path="/" element={<Navigate to="/summary" replace />} />
				<Route path="/summary" element={<SummaryPage />} />
				<Route path="/linear" element={<LinearPage />} />
				<Route path="/sentiment" element={<SentimentPage />} />
			</Routes>
		</div>
	);
}
