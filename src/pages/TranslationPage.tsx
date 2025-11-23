import { useMemo, useState } from 'react';
import { VoiceTextInput } from '../components/VoiceTextInput';

const SAMPLE_TEXT =
	'The future of artificial intelligence is rapidly evolving. With advancements in deep learning and neural networks, AI is transforming industries such as healthcare, finance, and transportation. As technology continues to improve, AI will play an even greater role in solving complex problems and enhancing human capabilities.';

export function TranslationPage() {
	const [inputText, setInputText] = useState<string>(SAMPLE_TEXT);
	const [targetLanguage, setTargetLanguage] = useState<string>('spanish');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [rawResponse, setRawResponse] = useState<unknown>(null);

	const bestEffortTranslation = useMemo(() => {
		if (!rawResponse || typeof rawResponse !== 'object') return '';
		const candidateKeys = ['translation', 'result', 'output', 'data'];
		for (const key of candidateKeys) {
			const value = (rawResponse as any)[key];
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
		setRawResponse(null);
		try {
			const response = await fetch('/api/agents/translation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text: inputText,
					agent_names: ['translation_agent'],
					args: {
						type: 'translate_text',
						target_language: targetLanguage
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

			{bestEffortTranslation && (
				<section className="card">
					<h2>Translation (best-effort)</h2>
					<div className="summary">{bestEffortTranslation}</div>
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


