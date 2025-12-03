import { useMemo, useState } from 'react';
import { VoiceTextInput } from '../components/VoiceTextInput';
import { RequestResponseViewer } from '../components/RequestResponseViewer';
import { makeApiCall } from '../utils/apiCall';

const SAMPLE_TEXT =
	"I recently purchased the latest smartphone, and I have mixed feelings about it. The design is absolutely stunning, and the display quality is top-notch. I love how vibrant and smooth everything looks. However, the battery life is disappointing. It barely lasts a full day, even with moderate use, which is frustrating. The camera takes great pictures in daylight, but the low-light performance is underwhelming. Overall, it's a decent phone, but for the price, I expected better battery performance.";

export function SentimentPage() {
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

	const bestEffortSentiment = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return '';
		const responseBody = (rawResponse as any).body;
		if (!responseBody || typeof responseBody !== 'object') return '';
		const candidateKeys = ['sentiment', 'result', 'output', 'data'];
		for (const key of candidateKeys) {
			const value = (responseBody as any)[key];
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
		setRawRequest(null);
		setRawResponse(null);
		
		const url = '/api/agents/sentiment';
		const method = 'POST';
		const headers = {
			'Content-Type': 'application/json'
		};
		const requestPayload = {
			text: inputText,
			agent_names: ['sentiment_analysis_agent'],
			args: {
				type: 'sentiment'
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
					id="sentiment-input"
					label="Input text"
					value={inputText}
					onChange={setInputText}
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

			<RequestResponseViewer request={rawRequest} response={rawResponse} bestEffortOutput={bestEffortSentiment} />
		</>
	);
}
