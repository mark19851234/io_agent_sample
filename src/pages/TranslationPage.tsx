import { useMemo, useState } from 'react';
import { VoiceTextInput } from '../components/VoiceTextInput';
import { RequestResponseViewer } from '../components/RequestResponseViewer';
import { makeApiCall } from '../utils/apiCall';

const SAMPLE_TEXT =
	'The future of artificial intelligence is rapidly evolving. With advancements in deep learning and neural networks, AI is transforming industries such as healthcare, finance, and transportation. As technology continues to improve, AI will play an even greater role in solving complex problems and enhancing human capabilities.';

export function TranslationPage() {
	const [inputText, setInputText] = useState<string>(SAMPLE_TEXT);
	const [targetLanguage, setTargetLanguage] = useState<string>('spanish');
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

	const bestEffortTranslation = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return '';
		const responseBody = (rawResponse as any).body;
		if (!responseBody || typeof responseBody !== 'object') return '';
		const candidateKeys = ['translation', 'result', 'output', 'data'];
		for (const key of candidateKeys) {
			const value = (responseBody as any)[key];
			if (typeof value === 'string') return value;
			if (value && typeof value === 'object') {
				if (typeof (value as any).translation === 'string') return (value as any).translation;
				if (typeof (value as any).result === 'string') return (value as any).result;
			}
		}
		return '';
	}, [rawResponse]);

	async function handleTranslate() {
		setIsLoading(true);
		setError(null);
		setRawRequest(null);
		setRawResponse(null);
		
		const url = '/api/agents/translation';
		const method = 'POST';
		const headers = {
			'Content-Type': 'application/json'
		};
		const requestPayload = {
			text: inputText,
			agent_names: ['translation_agent'],
			args: {
				type: 'translate_text',
				target_language: targetLanguage
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
					id="translation-input"
					label="Input text"
					value={inputText}
					onChange={setInputText}
					rows={12}
					placeholder="Paste text to translate..."
				/>
				<div className="actions" style={{ marginTop: 12 }}>
					<div style={{ flex: 1 }}>
						<label className="label" htmlFor="target">Target language</label>
						<input
							id="target"
							className="textarea"
							value={targetLanguage}
							onChange={(e) => setTargetLanguage(e.target.value)}
							placeholder="e.g., spanish, french, german"
						/>
					</div>
				</div>
				<div className="actions">
					<button className="button" onClick={handleTranslate} disabled={isLoading || !inputText.trim() || !targetLanguage.trim()}>
						{isLoading ? 'Translating…' : 'Translate'}
					</button>
				</div>
				{error && <div className="error">Error: {error}</div>}
			</section>

			<RequestResponseViewer request={rawRequest} response={rawResponse} bestEffortOutput={bestEffortTranslation} />
		</>
	);
}
