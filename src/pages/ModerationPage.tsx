import { useMemo, useState } from 'react';

const SAMPLE_TEXT =
	'I absolutely hate this service! It’s a total scam, and the customer support is useless. Anyone who buys from them is getting ripped off. I swear, if they don’t fix this issue, I’m going to make sure no one ever buys from them again! Also, I’ve seen people spreading false information about their competitors—this is unethical business practice.';

type ModerationCandidate = {
	flagged?: boolean;
	score?: number;
	categories?: string[];
	[key: string]: unknown;
};

export function ModerationPage() {
	const [inputText, setInputText] = useState<string>(SAMPLE_TEXT);
	const [threshold, setThreshold] = useState<number>(0.5);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [rawResponse, setRawResponse] = useState<unknown>(null);

	const summary = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return '';
		const obj = rawResponse as any;
		// Try common shapes
		const candidates: ModerationCandidate[] = [
			obj,
			obj?.result,
			obj?.data,
			obj?.moderation,
			obj?.result?.moderation,
		].filter(Boolean);
		for (const c of candidates) {
			if (!c || typeof c !== 'object') continue;
			const isFlagged = typeof c.flagged === 'boolean' ? c.flagged : undefined;
			const score =
				typeof c.score === 'number'
					? c.score
					: typeof c.risk_score === 'number'
					? (c as any).risk_score
					: undefined;
			const cats =
				Array.isArray(c.categories) && c.categories.every((x) => typeof x === 'string')
					? (c.categories as string[])
					: undefined;
			if (isFlagged !== undefined || score !== undefined || cats) {
				const parts: string[] = [];
				if (isFlagged !== undefined) parts.push(`flagged: ${isFlagged ? 'yes' : 'no'}`);
				if (score !== undefined) parts.push(`score: ${score}`);
				if (cats && cats.length) parts.push(`categories: ${cats.join(', ')}`);
				return parts.join(' | ');
			}
		}
		// Fallback: try string fields
		const str = obj?.moderation ?? obj?.result ?? obj?.output ?? obj?.data;
		if (typeof str === 'string') return str;
		return '';
	}, [rawResponse]);

	async function handleModerate() {
		setIsLoading(true);
		setError(null);
		setRawResponse(null);
		try {
			const response = await fetch('/api/agents/moderation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text: inputText,
					agent_names: ['moderation_agent'],
					args: {
						type: 'moderation',
						threshold
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
					placeholder="Paste text to moderate..."
				/>
				<div className="actions" style={{ marginTop: 12 }}>
					<div style={{ flex: 1 }}>
						<label className="label" htmlFor="threshold">Threshold (0–1)</label>
						<input
							id="threshold"
							className="textarea"
							type="number"
							step="0.01"
							min={0}
							max={1}
							value={threshold}
							onChange={(e) => setThreshold(Number(e.target.value))}
						/>
					</div>
				</div>
				<div className="actions">
					<button className="button" onClick={handleModerate} disabled={isLoading || !inputText.trim()}>
						{isLoading ? 'Checking…' : 'Run moderation'}
					</button>
				</div>
				{error && <div className="error">Error: {error}</div>}
			</section>

			{summary && (
				<section className="card">
					<h2>Result (best-effort)</h2>
					<div className="summary">{summary}</div>
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


