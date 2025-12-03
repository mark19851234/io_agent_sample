import { useMemo, useState } from 'react';
import { VoiceTextInput } from '../components/VoiceTextInput';
import { RequestResponseViewer } from '../components/RequestResponseViewer';
import { makeApiCall } from '../utils/apiCall';

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

	const classes: string[] = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return [];
		const responseBody = (rawResponse as any).body;
		if (!responseBody || typeof responseBody !== 'object') return [];
		// Try common shapes for classification
		const candidates = [
			responseBody?.labels,
			responseBody?.result?.labels,
			responseBody?.data?.labels,
			responseBody?.classification?.labels,
			responseBody?.result?.classification?.labels
		];
		for (const value of candidates) {
			if (Array.isArray(value)) {
				return value.filter((v) => typeof v === 'string');
			}
		}
		// Sometimes a single label might appear as a string
		const singleCandidates = [
			responseBody?.label,
			responseBody?.result?.label,
			responseBody?.data?.label,
			responseBody?.classification?.label
		];
		for (const value of singleCandidates) {
			if (typeof value === 'string') return [value];
		}
		return [];
	}, [rawResponse]);

	async function handleClassify() {
		setIsLoading(true);
		setError(null);
		setRawRequest(null);
		setRawResponse(null);
		
		const url = '/api/agents/classification';
		const method = 'POST';
		const headers = {
			'Content-Type': 'application/json'
		};
		const requestPayload = {
			text: inputText,
			agent_names: ['classification_agent'],
			args: {
				type: 'classify',
				classify_by: ['fact', 'fiction', 'sci-fi', 'fantasy']
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
					id="classification-input"
					label="Input text"
					value={inputText}
					onChange={setInputText}
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

			<RequestResponseViewer request={rawRequest} response={rawResponse} />
		</>
	);
}
