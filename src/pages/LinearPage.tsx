import { useMemo, useState, useEffect } from 'react';
import { VoiceTextInput } from '../components/VoiceTextInput';

const SAMPLE_TEXT =
	'show me my linear tickets';

const LINEAR_TOOL_NAMES = [
	'agno__linear__get_user_details',
	'agno__linear__get_issue_details',
	'agno__linear__create_issue',
	'agno__linear__update_issue',
	'agno__linear__get_user_assigned_issues',
	'agno__linear__get_workflow_issues',
	'agno__linear__get_high_priority_issues'
];

type Secret = {
	secret_id: string;
	secret_name: string;
	tool_name: string | null;
	tool_arg: string;
	is_default_for_tool: boolean;
	display: string;
};

export function LinearPage() {
	const [linearApiKey, setLinearApiKey] = useState<string>('');
	const [secretName, setSecretName] = useState<string>('linear-api-key');
	const [isSavingSecret, setIsSavingSecret] = useState<boolean>(false);
	const [secretError, setSecretError] = useState<string | null>(null);
	const [secretSuccess, setSecretSuccess] = useState<string | null>(null);
	const [isCheckingSecrets, setIsCheckingSecrets] = useState<boolean>(true);
	const [existingSecrets, setExistingSecrets] = useState<Map<string, string>>(new Map()); // tool_name -> secret_id
	const [isConfigured, setIsConfigured] = useState<boolean>(false);
	const [text, setText] = useState<string>(SAMPLE_TEXT);
	const [name, setName] = useState<string>('');
	const [objective, setObjective] = useState<string>('show me my linear tickets');
	const [instructions, setInstructions] = useState<string>('use tools to show me my tickets');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [rawResponse, setRawResponse] = useState<unknown>(null);

	// Check for existing secrets on mount
	useEffect(() => {
		async function checkExistingSecrets() {
			setIsCheckingSecrets(true);
			try {
				const response = await fetch('/api/secrets/');
				if (!response.ok) {
					console.error('Failed to fetch secrets');
					return;
				}
				const data = await response.json();
				const secrets: Secret[] = data.data || [];

				// Find secrets with our secret name and map tool_name to secret_id
				const secretMap = new Map<string, string>();
				let hasLinearSecrets = false;

				for (const secret of secrets) {
					if (secret.tool_name && secret.tool_arg === 'api_token') {
						secretMap.set(secret.tool_name, secret.secret_id);
						if (LINEAR_TOOL_NAMES.includes(secret.tool_name)) {
							hasLinearSecrets = true;
						}
					}
				}

				setExistingSecrets(secretMap);
				setIsConfigured(hasLinearSecrets);
			} catch (err) {
				console.error('Error checking secrets:', err);
			} finally {
				setIsCheckingSecrets(false);
			}
		}

		checkExistingSecrets();
	}, [secretName]);

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

	async function handleSaveSecret() {
		if (!linearApiKey.trim() || !secretName.trim()) {
			setSecretError('Please provide both secret name and Linear API key');
			return;
		}

		setIsSavingSecret(true);
		setSecretError(null);
		setSecretSuccess(null);

		try {
			// First, fetch current secrets to determine if we should use POST or PATCH
			const secretsResponse = await fetch('/api/secrets/');
			if (!secretsResponse.ok) {
				throw new Error('Failed to fetch existing secrets');
			}
			const secretsData = await secretsResponse.json();
			const secrets: Secret[] = secretsData.data || [];

			// Build a map of tool_name -> secret_id for our secret name
			const currentSecretsMap = new Map<string, string>();
			for (const secret of secrets) {
				currentSecretsMap.set(secret.secret_name, secret.secret_id);
			}

			// Call the secrets API for each Linear tool
			// Use PATCH if secret exists, POST if it doesn't
			const promises = LINEAR_TOOL_NAMES.map((toolName) => {
				const secretId = currentSecretsMap.get(`${secretName}-${toolName}`);
				const method = secretId ? 'PATCH' : 'POST';
				const url = secretId ? `/api/secrets/${secretId}` : '/api/secrets/';

				return fetch(url, {
					method,
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						secret_name: `${secretName}-${toolName}`,
						secret_value: linearApiKey,
						tool_name: toolName,
						tool_arg: 'api_token',
						is_default_for_tool: true
					})
				});
			});

			const responses = await Promise.all(promises);
			const errors: string[] = [];

			for (let i = 0; i < responses.length; i++) {
				if (!responses[i].ok) {
					const errorText = await responses[i].text();
					errors.push(`${LINEAR_TOOL_NAMES[i]}: ${errorText}`);
				}
			}

			if (errors.length > 0) {
				throw new Error(`Failed to save secrets for some tools:\n${errors.join('\n')}`);
			}

			// Refresh secrets after successful save
			const refreshResponse = await fetch('/api/secrets/?limit=10');
			if (refreshResponse.ok) {
				const data = await refreshResponse.json();
				const secrets: Secret[] = data.data || [];
				const secretMap = new Map<string, string>();
				for (const secret of secrets) {
					if (secret.secret_name === secretName && secret.tool_name) {
						secretMap.set(secret.tool_name, secret.secret_id);
					}
				}
				setExistingSecrets(secretMap);
				setIsConfigured(true);
			}

			const action = currentSecretsMap.size > 0 ? 'updated' : 'saved';
			setSecretSuccess(`Successfully ${action} Linear API key for all ${LINEAR_TOOL_NAMES.length} tools`);
		} catch (err: any) {
			setSecretError(err?.message ?? 'Failed to save Linear API key');
		} finally {
			setIsSavingSecret(false);
		}
	}

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
					agent_names: ['linear_agent'],
					args: {
						type: 'custom',
						name: "",
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
				<h2>Linear API Configuration</h2>
				<div style={{ marginBottom: '16px', padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }}>
					<p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>How to get your Linear API key:</p>
					<ol style={{ margin: '0', paddingLeft: '20px', color: '#666' }}>
						<li>Go to{' '}
							<a
								href="https://linear.app/ionet/settings/account/security"
								target="_blank"
								rel="noopener noreferrer"
								style={{ color: '#0066cc', textDecoration: 'underline' }}
							>
								Linear Security Settings
							</a>
						</li>
						<li>Create a new Personal API Access Token</li>
						<li>Copy the generated API key</li>
						<li>Paste it in the field below and click "Save Linear API Key"</li>
					</ol>
				</div>
				<p style={{ marginBottom: '16px', color: '#666' }}>
					Configure your Linear API key to enable Linear agent tools. The key will be saved for all Linear tools.
				</p>
				{isCheckingSecrets ? (
					<p style={{ marginBottom: '16px', color: '#666', fontStyle: 'italic' }}>Checking configuration status...</p>
				) : isConfigured ? (
					<div style={{ marginBottom: '16px', padding: '8px 12px', backgroundColor: '#1a3a2a', border: '1px solid #28a745', borderRadius: '4px', color: '#63e6be' }}>
						✓ Linear API key is already configured
					</div>
				) : (
					<div style={{ marginBottom: '16px', padding: '8px 12px', backgroundColor: '#3a2a1a', border: '1px solid #ffa500', borderRadius: '4px', color: '#ffd700' }}>
						⚠ Linear API key not configured. Please enter your API key below.
					</div>
				)}
				<div className="actions" style={{ marginBottom: '12px' }}>
					<div style={{ flex: 1 }}>
						<label className="label" htmlFor="secret-name">Secret Name</label>
						<input
							id="secret-name"
							className="textarea"
							value={secretName}
							readOnly
							style={{ backgroundColor: '#1a2332', color: '#eef2f6', cursor: 'not-allowed', opacity: 0.7 }}
							placeholder="e.g., linear-api-key"
						/>
					</div>
				</div>
				<div className="actions" style={{ marginBottom: '12px' }}>
					<div style={{ flex: 1 }}>
						<label className="label" htmlFor="linear-api-key">Linear API Key</label>
						<input
							id="linear-api-key"
							className="textarea"
							type="password"
							value={linearApiKey}
							onChange={(e) => setLinearApiKey(e.target.value)}
							placeholder="Enter your Linear API key"
						/>
					</div>
				</div>
				<div className="actions">
					<button
						className="button"
						onClick={handleSaveSecret}
						disabled={isSavingSecret || !linearApiKey.trim() || !secretName.trim()}
					>
						{isSavingSecret
							? 'Saving…'
							: isConfigured
								? 'Update Linear API Key'
								: 'Save Linear API Key'}
					</button>
				</div>
				{secretError && <div className="error" style={{ marginTop: '12px' }}>Error: {secretError}</div>}
				{secretSuccess && (
					<div style={{ marginTop: '12px', color: '#28a745', fontWeight: '500' }}>{secretSuccess}</div>
				)}
			</section>

			<section className="card">
				<VoiceTextInput
					id="linear-input"
					label="Input text"
					value={text}
					onChange={setText}
					rows={8}
					placeholder="Paste text for the linear agent..."
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


