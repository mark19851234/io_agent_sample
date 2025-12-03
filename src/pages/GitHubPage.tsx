import { useMemo, useState, useEffect } from 'react';
import { VoiceTextInput } from '../components/VoiceTextInput';
import { RequestResponseViewer } from '../components/RequestResponseViewer';
import { makeApiCall } from '../utils/apiCall';

const SAMPLE_TEXT =
	'show me my github issues';

const GITHUB_TOOL_NAMES = [
	'agno__github__search_repositories',
	'agno__github__list_repositories',
	'agno__github__get_repository',
	'agno__github__get_repository_languages',
	'agno__github__get_pull_request_count',
	'agno__github__get_pull_request',
	'agno__github__get_pull_request_changes',
	'agno__github__list_issues',
	'agno__github__get_issue',
	'agno__github__list_issue_comments',
	'agno__github__list_branches',
	'agno__github__get_repository_stars',
	'agno__github__get_pull_requests',
	'agno__github__get_pull_request_comments',
	'agno__github__get_pull_request_with_details',
	'agno__github__get_repository_with_stats',
	'agno__github__get_file_content',
	'agno__github__get_directory_content',
	'agno__github__get_branch_content',
	'agno__github__search_code',
	'agno__github__search_issues_and_prs'
];

type Secret = {
	secret_id: string;
	secret_name: string;
	tool_name: string | null;
	tool_arg: string;
	is_default_for_tool: boolean;
	display: string;
};

export function GitHubPage() {
	const [githubApiKey, setGithubApiKey] = useState<string>('');
	const [secretName, setSecretName] = useState<string>('github-api-key');
	const [isSavingSecret, setIsSavingSecret] = useState<boolean>(false);
	const [secretError, setSecretError] = useState<string | null>(null);
	const [secretSuccess, setSecretSuccess] = useState<string | null>(null);
	const [saveProgress, setSaveProgress] = useState<{ current: number; total: number } | null>(null);
	const [isCheckingSecrets, setIsCheckingSecrets] = useState<boolean>(true);
	const [existingSecrets, setExistingSecrets] = useState<Map<string, string>>(new Map()); // tool_name -> secret_id
	const [isConfigured, setIsConfigured] = useState<boolean>(false);
	const [text, setText] = useState<string>(SAMPLE_TEXT);
	const [name, setName] = useState<string>('foo');
	const [objective, setObjective] = useState<string>('check all repositories accessible to me and list unmerged PRs');
	const [instructions, setInstructions] = useState<string>('use tools to show me the information I requested');
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
				let hasGithubSecrets = false;

				for (const secret of secrets) {
					if (secret.tool_name && secret.tool_arg === 'api_token') {
						secretMap.set(secret.tool_name, secret.secret_id);
						if (GITHUB_TOOL_NAMES.includes(secret.tool_name)) {
							hasGithubSecrets = true;
						}
					}
				}

				setExistingSecrets(secretMap);
				setIsConfigured(hasGithubSecrets);
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
		const responseBody = (rawResponse as any).body;
		if (!responseBody || typeof responseBody !== 'object') return '';
		const candidateKeys = ['result', 'output', 'summary', 'data'];
		for (const key of candidateKeys) {
			const value = (responseBody as any)[key];
			if (typeof value === 'string') return value;
			if (value && typeof value === 'object') {
				if (typeof (value as any).result === 'string') return (value as any).result;
				if (typeof (value as any).summary === 'string') return (value as any).summary;
			}
		}
		return '';
	}, [rawResponse]);

	async function handleSaveSecret() {
		if (!githubApiKey.trim() || !secretName.trim()) {
			setSecretError('Please provide both secret name and GitHub API key');
			return;
		}

		setIsSavingSecret(true);
		setSecretError(null);
		setSecretSuccess(null);
		setSaveProgress({ current: 0, total: GITHUB_TOOL_NAMES.length });

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

			// Call the secrets API for each GitHub tool in batches to avoid rate limiting
			// Use PATCH if secret exists, POST if it doesn't
			const BATCH_SIZE = 2; // Process 2 requests at a time (reduced to avoid rate limits)
			const BATCH_DELAY = 1000; // Wait 1 second between batches
			const MAX_RETRIES = 3;
			const errors: string[] = [];

			async function makeRequestWithRetry(
				toolName: string,
				secretId: string | undefined,
				method: string,
				url: string,
				body: any,
				retries = MAX_RETRIES
			): Promise<{ toolName: string; error: string | null }> {
				for (let attempt = 0; attempt <= retries; attempt++) {
					try {
						const response = await fetch(url, {
							method,
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify(body)
						});

						if (response.status === 429) {
							// Rate limited - wait and retry
							if (attempt < retries) {
								const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
								await new Promise((resolve) => setTimeout(resolve, waitTime));
								continue;
							}
							const errorText = await response.text();
							return { toolName, error: `Rate limited after ${retries + 1} attempts: ${errorText}` };
						}

						if (!response.ok) {
							const errorText = await response.text();
							return { toolName, error: errorText };
						}

						return { toolName, error: null };
					} catch (err: any) {
						if (attempt < retries) {
							const waitTime = Math.pow(2, attempt) * 1000;
							await new Promise((resolve) => setTimeout(resolve, waitTime));
							continue;
						}
						return { toolName, error: err?.message ?? 'Unknown error' };
					}
				}
				return { toolName, error: 'Max retries exceeded' };
			}

			for (let i = 0; i < GITHUB_TOOL_NAMES.length; i += BATCH_SIZE) {
				const batch = GITHUB_TOOL_NAMES.slice(i, i + BATCH_SIZE);
				const promises = batch.map((toolName) => {
					const secretId = currentSecretsMap.get(`${secretName}-${toolName}`);
					const method = secretId ? 'PATCH' : 'POST';
					const url = secretId ? `/api/secrets/${secretId}` : '/api/secrets/';

					return makeRequestWithRetry(
						toolName,
						secretId,
						method,
						url,
						{
							secret_name: `${secretName}-${toolName}`,
							secret_value: githubApiKey,
							tool_name: toolName,
							tool_arg: 'api_token',
							is_default_for_tool: true
						}
					);
				});

				const batchResults = await Promise.all(promises);
				for (const result of batchResults) {
					if (result.error) {
						errors.push(`${result.toolName}: ${result.error}`);
					}
				}

				// Update progress
				const completed = Math.min(i + BATCH_SIZE, GITHUB_TOOL_NAMES.length);
				setSaveProgress({ current: completed, total: GITHUB_TOOL_NAMES.length });

				// Wait before processing next batch (except for the last batch)
				if (i + BATCH_SIZE < GITHUB_TOOL_NAMES.length) {
					await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
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
			setSecretSuccess(`Successfully ${action} GitHub API key for all ${GITHUB_TOOL_NAMES.length} tools`);
			setSaveProgress(null);
		} catch (err: any) {
			setSecretError(err?.message ?? 'Failed to save GitHub API key');
			setSaveProgress(null);
		} finally {
			setIsSavingSecret(false);
		}
	}

	async function handleRun() {
		setIsLoading(true);
		setError(null);
		setRawRequest(null);
		setRawResponse(null);

		const url = '/api/agents/github';
		const method = 'POST';
		const headers = {
			'Content-Type': 'application/json'
		};
		const requestPayload = {
			text,
			agent_names: ['github_agent'],
			args: {
				type: 'custom',
				name: "",
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
				<h2>GitHub API Configuration</h2>
				<div style={{ marginBottom: '16px', padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }}>
					<p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>How to get your GitHub API key:</p>
					<ol style={{ margin: '0', paddingLeft: '20px', color: '#666' }}>
						<li>Go to{' '}
							<a
								href="https://github.com/settings/tokens"
								target="_blank"
								rel="noopener noreferrer"
								style={{ color: '#0066cc', textDecoration: 'underline' }}
							>
								GitHub Personal Access Tokens
							</a>
						</li>
						<li>Click "Generate new token" → "Generate new token (classic)"</li>
						<li>Select the required scopes (e.g., repo, issues, pull requests)</li>
						<li>Copy the generated token</li>
						<li>Paste it in the field below and click "Save GitHub API Key"</li>
					</ol>
				</div>
				<p style={{ marginBottom: '16px', color: '#666' }}>
					Configure your GitHub API key to enable GitHub agent tools. The key will be saved for all GitHub tools.
				</p>
				{isCheckingSecrets ? (
					<p style={{ marginBottom: '16px', color: '#666', fontStyle: 'italic' }}>Checking configuration status...</p>
				) : isConfigured ? (
					<div style={{ marginBottom: '16px', padding: '8px 12px', backgroundColor: '#1a3a2a', border: '1px solid #28a745', borderRadius: '4px', color: '#63e6be' }}>
						✓ GitHub API key is already configured
					</div>
				) : (
					<div style={{ marginBottom: '16px', padding: '8px 12px', backgroundColor: '#3a2a1a', border: '1px solid #ffa500', borderRadius: '4px', color: '#ffd700' }}>
						⚠ GitHub API key not configured. Please enter your API key below.
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
							placeholder="e.g., github-api-key"
						/>
					</div>
				</div>
				<div className="actions" style={{ marginBottom: '12px' }}>
					<div style={{ flex: 1 }}>
						<label className="label" htmlFor="github-api-key">GitHub API Key</label>
						<input
							id="github-api-key"
							className="textarea"
							type="password"
							value={githubApiKey}
							onChange={(e) => setGithubApiKey(e.target.value)}
							placeholder="Enter your GitHub API key"
						/>
					</div>
				</div>
				<div className="actions">
					<button
						className="button"
						onClick={handleSaveSecret}
						disabled={isSavingSecret || !githubApiKey.trim() || !secretName.trim()}
					>
						{isSavingSecret
							? saveProgress
								? `Saving… (${saveProgress.current}/${saveProgress.total})`
								: 'Saving…'
							: isConfigured
								? 'Update GitHub API Key'
								: 'Save GitHub API Key'}
					</button>
				</div>
				{saveProgress && (
					<div style={{ marginTop: '12px', color: '#63e6be', fontWeight: '500' }}>
						Progress: {saveProgress.current} of {saveProgress.total} tools configured
					</div>
				)}
				{secretError && <div className="error" style={{ marginTop: '12px' }}>Error: {secretError}</div>}
				{secretSuccess && (
					<div style={{ marginTop: '12px', color: '#28a745', fontWeight: '500' }}>{secretSuccess}</div>
				)}
			</section>

			<section className="card">
				<VoiceTextInput
					id="github-input"
					label="Input text"
					value={text}
					onChange={setText}
					rows={8}
					placeholder="Paste text for the github agent..."
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
						{isLoading ? 'Running…' : 'Run github agent'}
					</button>
				</div>
				{error && <div className="error">Error: {error}</div>}
			</section>

			<RequestResponseViewer request={rawRequest} response={rawResponse} bestEffortOutput={bestEffortOutput} />
		</>
	);
}


