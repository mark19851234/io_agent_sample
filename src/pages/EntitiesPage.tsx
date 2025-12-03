import { useMemo, useState } from 'react';
import { VoiceTextInput } from '../components/VoiceTextInput';
import { RequestResponseViewer } from '../components/RequestResponseViewer';
import { makeApiCall } from '../utils/apiCall';

const SAMPLE_TEXT =
	"A leading technology company recently announced the launch of its latest smartphone, the Nova X, at an event in Tech Valley. The company's CEO, Jordan Lane, highlighted the device's improved battery life, advanced camera system, and AI-powered enhancements. To achieve higher performance and energy efficiency, the company partnered with Coretron Systems to develop the new Zenith chipset. Pre-orders will begin on October 10, and the device will be available in global markets by October 20. Industry analysts predict strong demand across multiple regions, driven by innovation and evolving consumer expectations.";

type EntityMap = Record<string, string[]>;

export function EntitiesPage() {
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

	const entities: EntityMap = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return {};
		const responseBody = (rawResponse as any).body;
		if (!responseBody || typeof responseBody !== 'object') return {};
		// Try common shapes
		const candidates = [
			responseBody?.entities,
			responseBody?.categorized_entities,
			responseBody?.result?.entities,
			responseBody?.result?.categorized_entities,
			responseBody?.data?.entities,
			responseBody?.data?.categorized_entities
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
		setRawRequest(null);
		setRawResponse(null);
		
		const url = '/api/agents/entities';
		const method = 'POST';
		const headers = {
			'Content-Type': 'application/json'
		};
		const requestPayload = {
			text: inputText,
			agent_names: ['extractor'],
			args: {
				type: 'extract_categorized_entities'
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
					id="entities-input"
					label="Input text"
					value={inputText}
					onChange={setInputText}
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

			<RequestResponseViewer request={rawRequest} response={rawResponse} />
		</>
	);
}
