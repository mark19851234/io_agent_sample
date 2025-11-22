import { useMemo, useState } from 'react';

const SAMPLE_TEXT =
	'A leading technology company recently announced the launch of its latest smartphone, the Nova X, at an event in Tech Valley. The company’s CEO, Jordan Lane, highlighted the device’s improved battery life, advanced camera system, and AI-powered enhancements. To achieve higher performance and energy efficiency, the company partnered with Coretron Systems to develop the new Zenith chipset. Pre-orders will begin on October 10, and the device will be available in global markets by October 20. Industry analysts predict strong demand across multiple regions, driven by innovation and evolving consumer expectations.';

type EntityMap = Record<string, string[]>;

export function EntitiesPage() {
	const [inputText, setInputText] = useState<string>(SAMPLE_TEXT);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [rawResponse, setRawResponse] = useState<unknown>(null);

	const entities: EntityMap = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return {};
		const obj = rawResponse as any;
		// Try common shapes
		const candidates = [
			obj?.entities,
			obj?.categorized_entities,
			obj?.result?.entities,
			obj?.result?.categorized_entities,
			obj?.data?.entities,
			obj?.data?.categorized_entities
		];
		for (const candidate of candidates) {
			if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
				const map: EntityMap = {};
				for (const [k, v] of Object.entries(candidate)) {
					if (Array.isArray(v)) {
						map[k] = v.filter((x) => typeof x === 'string') as string[];
					}
				}
				return map;
			}
		}
		return {};
	}, [rawResponse]);

	async function handleExtract() {
		setIsLoading(true);
		setError(null);
		setRawResponse(null);
		try {
			const response = await fetch('/api/agents/entities', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text: inputText,
					agent_names: ['extractor'],
					args: {
						type: 'extract_categorized_entities'
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
					placeholder="Paste text to extract entities..."
				/>
				<div className="actions">
					<button className="button" onClick={handleExtract} disabled={isLoading || !inputText.trim()}>
						{isLoading ? 'Extracting…' : 'Extract entities'}
					</button>
				</div>
				{error && <div className="error">Error: {error}</div>}
			</section>

			{Object.keys(entities).length > 0 && (
				<section className="card">
					<h2>Entities (grouped)</h2>
					<ul className="list">
						{Object.entries(entities).map(([category, items]) => (
							<li key={category}>
								<strong>{category}</strong>
								<ul className="list">
									{items.map((ent, idx) => (
										<li key={`${category}-${idx}`}>{ent}</li>
									))}
								</ul>
							</li>
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


