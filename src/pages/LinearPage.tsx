import { useMemo, useState } from 'react';

const SAMPLE_TEXT =
	'The global electric vehicle (EV) market is witnessing exponential growth, driven by advancements in battery technology and government incentives. Major automakers, including Tesla, Ford, and Volkswagen, are investing heavily in EV production. However, challenges such as charging infrastructure and raw material shortages for lithium-ion batteries remain key concerns. Industry experts predict that by 2030, EVs will account for over 50% of new car sales worldwide, marking a significant shift in the automotive landscape.';

export function LinearPage() {
	const [text, setText] = useState<string>(SAMPLE_TEXT);
	const [name, setName] = useState<string>('calc 2+2');
	const [objective, setObjective] = useState<string>('Calculate 2+2');
	const [instructions, setInstructions] = useState<string>('Return result of calculation');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [rawResponse, setRawResponse] = useState<unknown>(null);

	const bestEffortOutput = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return '';
		const candidateKeys = ['result', 'output', 'summary', 'data'];
		for (const key of candidateKeys) {
			const value = (rawResponse as any)[key];
			if (typeof value === 'string') return value;
			if (value && typeof value === 'object') {
				if (typeof (value as any).result === 'string') return (value as any).result;
				if (typeof (value as any).summary === 'string') return (value as any).summary;
			}
		}
		return '';
	}, [rawResponse]);

	async function handleRun() {
		setIsLoading(true);
		setError(null);
		setRawResponse(null);
		try {
			const response = await fetch('/api/agents/linear', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text,
					agent_names: ['custom_agent'],
					args: {
						type: 'custom',
						name,
						objective,
						instructions
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
				<label className="label" htmlFor="text">Input text</label>
				<textarea
					id="text"
					className="textarea"
					rows={8}
					value={text}
					onChange={(e) => setText(e.target.value)}
				/>
				<div className="actions" style={{ marginTop: 12 }}>
					<div style={{ flex: 1 }}>
						<label className="label" htmlFor="name">Name</label>
						<input id="name" className="textarea" value={name} onChange={(e) => setName(e.target.value)} />
					</div>
				</div>
				<div className="actions">
					<div style={{ flex: 1 }}>
						<label className="label" htmlFor="objective">Objective</label>
						<input id="objective" className="textarea" value={objective} onChange={(e) => setObjective(e.target.value)} />
					</div>
					<div style={{ flex: 1 }}>
						<label className="label" htmlFor="instructions">Instructions</label>
						<input id="instructions" className="textarea" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
					</div>
				</div>
				<div className="actions">
					<button className="button" onClick={handleRun} disabled={isLoading || !text.trim()}>
						{isLoading ? 'Running…' : 'Run linear agent'}
					</button>
				</div>
				{error && <div className="error">Error: {error}</div>}
			</section>

			{bestEffortOutput && (
				<section className="card">
					<h2>Result (best-effort)</h2>
					<div className="summary">{bestEffortOutput}</div>
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


