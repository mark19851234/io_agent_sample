import { useMemo, useState } from 'react';
import { VoiceTextInput } from '../components/VoiceTextInput';
import { RequestResponseViewer } from '../components/RequestResponseViewer';
import { makeApiCall } from '../utils/apiCall';

const SAMPLE_TEXT =
	'In the rapidly evolving landscape of artificial intelligence, the ability to condense vast amounts of information into concise and meaningful summaries is crucial. From research papers and business reports to legal documents and news articles, professionals across industries rely on summarization to extract key insights efficiently. Traditional summarization techniques often struggle with maintaining coherence and contextual relevance. However, advanced AI models now leverage natural language understanding to identify core ideas, eliminate redundancy, and generate human-like summaries. As organizations continue to deal with an ever-growing influx of data, the demand for intelligent summarization tools will only increase. Whether enhancing productivity, improving decision-making, or streamlining workflows, AI-powered summarization is set to become an indispensable asset in the digital age.';

export function SummaryPage() {
	const [inputText, setInputText] = useState<string>(SAMPLE_TEXT);
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

	const bestEffortSummary = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return '';
		const responseBody = (rawResponse as any).body;
		if (!responseBody || typeof responseBody !== 'object') return '';
		const candidateKeys = ['summary', 'result', 'output', 'data'];
		for (const key of candidateKeys) {
			const value = (responseBody as any)[key];
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
		const responseBody = (rawResponse as any).body;
		if (!responseBody || typeof responseBody !== 'object') return [];
		const candidates = [responseBody?.result?.key_points, responseBody?.key_points, responseBody?.data?.key_points];
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
		setRawRequest(null);
		setRawResponse(null);
		
		const url = '/api/agents/summary';
		const method = 'POST';
		const headers = {
			'Content-Type': 'application/json'
		};
		const requestPayload = {
			text: inputText,
			agent_names: ['summary_agent'],
			args: {
				type: 'summarize_text'
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
					id="summary-input"
					label="Input text"
					value={inputText}
					onChange={setInputText}
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

			<RequestResponseViewer request={rawRequest} response={rawResponse} bestEffortOutput={bestEffortSummary} />
		</>
	);
}


