import { useMemo, useState } from 'react';

const SAMPLE_TEXT =
	'In the rapidly evolving landscape of artificial intelligence, the ability to condense vast amounts of information into concise and meaningful summaries is crucial. From research papers and business reports to legal documents and news articles, professionals across industries rely on summarization to extract key insights efficiently. Traditional summarization techniques often struggle with maintaining coherence and contextual relevance. However, advanced AI models now leverage natural language understanding to identify core ideas, eliminate redundancy, and generate human-like summaries. As organizations continue to deal with an ever-growing influx of data, the demand for intelligent summarization tools will only increase. Whether enhancing productivity, improving decision-making, or streamlining workflows, AI-powered summarization is set to become an indispensable asset in the digital age.';

export function SummaryPage() {
	const [inputText, setInputText] = useState<string>(SAMPLE_TEXT);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [rawResponse, setRawResponse] = useState<unknown>(null);

	const bestEffortSummary = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return '';
		const candidateKeys = ['summary', 'result', 'output', 'data'];
		for (const key of candidateKeys) {
			const value = (rawResponse as any)[key];
			if (typeof value === 'string') return value;
			if (value && typeof value === 'object') {
				if (typeof (value as any).summary === 'string') return (value as any).summary;
				if (typeof (value as any).result === 'string') return (value as any).result;
				if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') return value[0];
			}
		}
		return '';
	}, [rawResponse]);

	const keyPoints: string[] = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return [];
		const obj = rawResponse as any;
		const candidates = [obj?.result?.key_points, obj?.key_points, obj?.data?.key_points];
		for (const value of candidates) {
			if (Array.isArray(value)) {
				return value.filter((v) => typeof v === 'string');
			}
		}
		return [];
	}, [rawResponse]);

	async function handleSummarize() {
		setIsLoading(true);
		setError(null);
		setRawResponse(null);
		try {
			const response = await fetch('/api/agents/summary', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text: inputText,
					agent_names: ['summary_agent'],
					args: {
						type: 'summarize_text'
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
					placeholder="Paste text to summarize..."
				/>
				<div className="actions">
					<button className="button" onClick={handleSummarize} disabled={isLoading || !inputText.trim()}>
						{isLoading ? 'Summarizing…' : 'Summarize'}
					</button>
				</div>
				{error && <div className="error">Error: {error}</div>}
			</section>

			{bestEffortSummary && (
				<section className="card">
					<h2>Summary (best-effort)</h2>
					<div className="summary">{bestEffortSummary}</div>
				</section>
			)}

			{keyPoints.length > 0 && (
				<section className="card">
					<h2>Key points</h2>
					<ul className="list">
						{keyPoints.map((point, idx) => (
							<li key={idx}>{point}</li>
						))}
					</ul>
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


