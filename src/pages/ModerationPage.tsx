import { useMemo, useState } from 'react';
import { VoiceTextInput } from '../components/VoiceTextInput';
import { RequestResponseViewer } from '../components/RequestResponseViewer';
import { makeApiCall } from '../utils/apiCall';

const SAMPLE_TEXT =
	"I absolutely hate this service! It's a total scam, and the customer support is useless. Anyone who buys from them is getting ripped off. I swear, if they don't fix this issue, I'm going to make sure no one ever buys from them again! Also, I've seen people spreading false information about their competitors—this is unethical business practice.";

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

	const summary = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return '';
		const responseBody = (rawResponse as any).body;
		if (!responseBody || typeof responseBody !== 'object') return '';
		// Try common shapes
		const candidates: ModerationCandidate[] = [
			responseBody,
			responseBody?.result,
			responseBody?.data,
			responseBody?.moderation,
			responseBody?.result?.moderation,
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
		const str = responseBody?.moderation ?? responseBody?.result ?? responseBody?.output ?? responseBody?.data;
		if (typeof str === 'string') return str;
		return '';
	}, [rawResponse]);

	async function handleModerate() {
		setIsLoading(true);
		setError(null);
		setRawRequest(null);
		setRawResponse(null);
		
		const url = '/api/agents/moderation';
		const method = 'POST';
		const headers = {
			'Content-Type': 'application/json'
		};
		const requestPayload = {
			text: inputText,
			agent_names: ['moderation_agent'],
			args: {
				type: 'moderation',
				threshold
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
					id="moderation-input"
					label="Input text"
					value={inputText}
					onChange={setInputText}
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

			<RequestResponseViewer request={rawRequest} response={rawResponse} bestEffortOutput={summary} />
		</>
	);
}
