import { useMemo, useState } from 'react';

const SAMPLE_TEXT =
	'I recently purchased the latest smartphone, and I have mixed feelings about it. The design is absolutely stunning, and the display quality is top-notch. I love how vibrant and smooth everything looks. However, the battery life is disappointing. It barely lasts a full day, even with moderate use, which is frustrating. The camera takes great pictures in daylight, but the low-light performance is underwhelming. Overall, it’s a decent phone, but for the price, I expected better battery performance.';

export function SentimentPage() {
	const [inputText, setInputText] = useState<string>(SAMPLE_TEXT);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [rawResponse, setRawResponse] = useState<unknown>(null);

	const bestEffortSentiment = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return '';
		const candidateKeys = ['sentiment', 'result', 'output', 'data'];
		for (const key of candidateKeys) {
			const value = (rawResponse as any)[key];
			if (typeof value === 'string') return value;
			if (value && typeof value === 'object') {
				if (typeof (value as any).sentiment === 'string') return (value as any).sentiment;
				if (typeof (value as any).result === 'string') return (value as any).result;
			}
		}
		return '';
	}, [rawResponse]);

	async function handleAnalyze() {
		setIsLoading(true);
		setError(null);
		setRawResponse(null);
		try {
			const response = await fetch('/api/agents/sentiment', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text: inputText,
					agent_names: ['sentiment_analysis_agent'],
					args: {
						type: 'sentiment'
					}
				})
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`Request failed (${response.status}): ${text}`);
			}

			const data = await response.json();
			setRawResponse(data);
		} catch (err: any) {
			setError(err?.message ?? 'Unknown error');
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<>
			<section className="card">
				<label htmlFor="input" className="label">
					Input text
				</label>
				<textarea
					id="input"
					className="textarea"
					value={inputText}
					onChange={(e) => setInputText(e.target.value)}
					rows={12}
					placeholder="Paste text to analyze sentiment..."
				/>
				<div className="actions">
					<button className="button" onClick={handleAnalyze} disabled={isLoading || !inputText.trim()}>
						{isLoading ? 'Analyzing…' : 'Analyze sentiment'}
					</button>
				</div>
				{error && <div className="error">Error: {error}</div>}
			</section>

			{bestEffortSentiment && (
				<section className="card">
					<h2>Sentiment (best-effort)</h2>
					<div className="summary">{bestEffortSentiment}</div>
				</section>
			)}

			{rawResponse && (
				<section className="card">
					<h2>Raw response</h2>
					<pre className="pre">{JSON.stringify(rawResponse, null, 2)}</pre>
				</section>
			)}
		</>
	);
}


