import { useMemo, useState } from 'react';

const SAMPLE_TEXT =
	'A major tech company has announced a breakthrough in battery technology that significantly enhances energy density and reduces charging time. This innovation is expected to accelerate the adoption of electric vehicles, making them more practical for everyday use. Industry experts predict that this advancement could drive increased competition in the market and attract further investment in sustainable energy solutions.';

type ClassificationResult = {
	labels?: string[];
	[className: string]: unknown;
};

export function ClassificationPage() {
	const [inputText, setInputText] = useState<string>(SAMPLE_TEXT);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [rawResponse, setRawResponse] = useState<unknown>(null);

	const classes: string[] = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return [];
		const obj = rawResponse as any;
		// Try common shapes for classification
		const candidates = [
			obj?.labels,
			obj?.result?.labels,
			obj?.data?.labels,
			obj?.classification?.labels,
			obj?.result?.classification?.labels
		];
		for (const value of candidates) {
			if (Array.isArray(value)) {
				return value.filter((v) => typeof v === 'string');
			}
		}
		// Sometimes a single label might appear as a string
		const singleCandidates = [
			obj?.label,
			obj?.result?.label,
			obj?.data?.label,
			obj?.classification?.label
		];
		for (const value of singleCandidates) {
			if (typeof value === 'string') return [value];
		}
		return [];
	}, [rawResponse]);

	async function handleClassify() {
		setIsLoading(true);
		setError(null);
		setRawResponse(null);
		try {
			const response = await fetch('/api/agents/classification', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text: inputText,
					agent_names: ['classification_agent'],
					args: {
						type: 'classify',
						classify_by: ['fact', 'fiction', 'sci-fi', 'fantasy']
					}
				})
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`Request failed (${response.status}): ${text}`);
			}

			const data: ClassificationResult = await response.json();
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
					placeholder="Paste text to classify..."
				/>
				<div className="actions">
					<button className="button" onClick={handleClassify} disabled={isLoading || !inputText.trim()}>
						{isLoading ? 'Classifying…' : 'Classify'}
					</button>
				</div>
				{error && <div className="error">Error: {error}</div>}
			</section>

			{classes.length > 0 && (
				<section className="card">
					<h2>Predicted classes</h2>
					<ul className="list">
						{classes.map((c, idx) => (
							<li key={idx}>{c}</li>
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


