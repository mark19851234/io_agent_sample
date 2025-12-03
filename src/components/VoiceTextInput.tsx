import { useCallback, useMemo, useRef, useState } from 'react';

type VoiceTextInputProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	rows?: number;
	placeholder?: string;
	appendMode?: 'append' | 'replace';
	disabled?: boolean;
	id?: string;
};

export function VoiceTextInput(props: VoiceTextInputProps) {
	const {
		label,
		value,
		onChange,
		rows = 12,
		placeholder,
		appendMode = 'append',
		disabled = false,
		id
	} = props;

	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [interim, setInterim] = useState<string>('');
	const [error, setError] = useState<string | null>(null);
	const recognitionRef = useRef<any | null>(null);
	const finalTranscriptRef = useRef<string>('');

	const canUseSpeech = useMemo(() => {
		// Browser support check
		const w = window as any;
		return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
	}, []);

	const getRecognizer = useCallback(() => {
		const w = window as any;
		const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
		if (!Ctor) return null;
		const rec = new Ctor();
		rec.lang = 'en-US';
		rec.continuous = true;
		rec.interimResults = true;
		return rec;
	}, []);

	const commitTranscript = useCallback(
		(transcript: string) => {
			if (!transcript.trim()) return;
			if (appendMode === 'replace') {
				onChange(transcript);
			} else {
				const sep = value && !/\s$/.test(value) ? ' ' : '';
				onChange(`${value}${sep}${transcript}`);
			}
		},
		[appendMode, onChange, value]
	);

	const stopRecording = useCallback(() => {
		try {
			recognitionRef.current?.stop?.();
		} catch {
			// no-op
		}
		setIsRecording(false);
	}, []);

	const startRecording = useCallback(() => {
		setError(null);
		finalTranscriptRef.current = '';
		setInterim('');
		const rec = getRecognizer();
		if (!rec) {
			setError('Speech recognition not supported in this browser.');
			return;
		}

		rec.onresult = (event: any) => {
			let interimText = '';
			for (let i = event.resultIndex; i < event.results.length; i++) {
				const res = event.results[i];
				const text = res[0]?.transcript ?? '';
				if (res.isFinal) {
					finalTranscriptRef.current += text;
				} else {
					interimText += text;
				}
			}
			setInterim(interimText);
		};
		rec.onerror = (e: any) => {
			setError(e?.error ? String(e.error) : 'Unknown speech error');
			stopRecording();
		};
		rec.onend = () => {
			// Commit the final transcript when recognition ends
			const finalText = finalTranscriptRef.current.trim();
			if (finalText) commitTranscript(finalText);
			setInterim('');
			setIsRecording(false);
		};

		try {
			rec.start();
			recognitionRef.current = rec;
			setIsRecording(true);
		} catch (e: any) {
			setError(e?.message ?? 'Unable to start recording');
			setIsRecording(false);
		}
	}, [commitTranscript, getRecognizer, stopRecording]);

	return (
		<div className="flex flex-col gap-2 pb-10" style={{ marginBottom: '30px' }}>
			<label htmlFor={id ?? 'voice-input'} className="label">
				{label}
			</label>
			<textarea
				id={id ?? 'voice-input'}
				className="textarea"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				rows={rows}
				placeholder={placeholder}
				disabled={disabled}
			/>
			<div className="actions">
				<button
					className="button"
					onClick={isRecording ? stopRecording : startRecording}
					disabled={!canUseSpeech || disabled}
					aria-pressed={isRecording}
				>
					{isRecording ? 'Stop recording' : canUseSpeech ? 'Record voice' : 'Voice unsupported'}
				</button>
				{isRecording && <div style={{ marginLeft: 12 }}>Listening… {interim && `(“${interim}”)`}</div>}
			</div>
			{error && <div className="error">Speech error: {error}</div>}
		</div>
	);
}


