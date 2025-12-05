import { useMemo, useState } from 'react';
import { VoiceTextInput } from '../components/VoiceTextInput';
import { RequestResponseViewer } from '../components/RequestResponseViewer';
import { makeApiCall } from '../utils/apiCall';

const SAMPLE_TEXT = 'Macbook comparison';

export function YouTubePage() {
	const [text, setText] = useState<string>(SAMPLE_TEXT);
	const [name, setName] = useState<string>('youtube_analyst_agent');
	const [objective, setObjective] = useState<string>('Compare all the products mentioned in this youtube video : https://www.youtube.com/watch?v=avtz2A99zXo');
	const [instructions, setInstructions] = useState<string>('compare all the products create a table , show pros and cons and also attach video timestamps');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [rawRequest, setRawRequest] = useState<{
		url: string;
		method: string;
		headers: Record<string, string>;
		body: unknown;
		curl: string;
	} | null>(null);
	const [rawResponse, setRawResponse] = useState<{
		status: number;
		statusText: string;
		headers: Record<string, string>;
		body: unknown;
	} | null>(null);

	const bestEffortOutput = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return '';
		const responseBody = (rawResponse as any).body;
		if (!responseBody || typeof responseBody !== 'object') return '';
		const candidateKeys = ['result', 'output', 'summary', 'data', 'comparison'];
		for (const key of candidateKeys) {
			const value = (responseBody as any)[key];
			if (typeof value === 'string') return value;
			if (value && typeof value === 'object') {
				if (typeof (value as any).result === 'string') return (value as any).result;
				if (typeof (value as any).summary === 'string') return (value as any).summary;
				if (typeof (value as any).comparison === 'string') return (value as any).comparison;
			}
		}
		return '';
	}, [rawResponse]);

	async function handleRun() {
		setIsLoading(true);
		setError(null);
		setRawRequest(null);
		setRawResponse(null);

		const url = '/api/agents/youtube';
		const method = 'POST';
		const headers = {
			'Content-Type': 'application/json'
		};
		const requestPayload = {
			text,
			agent_names: ['youtube_analyst_agent'],
			args: {
				type: 'custom',
				name,
				objective,
				instructions
			}
		};

		try {
			const { request, response } = await makeApiCall(url, method, headers, requestPayload);

			setRawRequest(request);
			setRawResponse(response);

			if (!response.status || (response.status >= 400)) {
				const errorMessage = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
				throw new Error(`Request failed (${response.status}): ${errorMessage}`);
			}
		} catch (err: any) {
			setError(err?.message ?? 'Unknown error');
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<>
			<section className="card">
				<VoiceTextInput
					id="youtube-input"
					label="Input text"
					value={text}
					onChange={setText}
					rows={8}
					placeholder="Enter your query (e.g., Macbook comparison)..."
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
						<input
							id="objective"
							className="textarea"
							value={objective}
							onChange={(e) => setObjective(e.target.value)}
							placeholder="e.g., Compare all the products mentioned in this youtube video : https://www.youtube.com/watch?v=..."
						/>
					</div>
					<div style={{ flex: 1 }}>
						<label className="label" htmlFor="instructions">Instructions</label>
						<input
							id="instructions"
							className="textarea"
							value={instructions}
							onChange={(e) => setInstructions(e.target.value)}
							placeholder="e.g., compare all the products create a table, show pros and cons..."
						/>
					</div>
				</div>
				<div className="actions">
					<button className="button" onClick={handleRun} disabled={isLoading || !text.trim()}>
						{isLoading ? 'Running…' : 'Run YouTube comparison agent'}
					</button>
				</div>
				{error && <div className="error">Error: {error}</div>}
			</section>

			<RequestResponseViewer request={rawRequest} response={rawResponse} bestEffortOutput={bestEffortOutput} />
		</>
	);
}

