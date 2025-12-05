type RequestData = {
	url: string;
	method: string;
	headers: Record<string, string>;
	body: unknown;
	curl: string;
};

type ResponseData = {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: unknown;
};

// Get the actual API endpoint from the proxy URL
function getActualApiUrl(proxyUrl: string): string {
	const apiBase = import.meta.env.VITE_IO_API_BASE || 'https://api.intelligence-dev.io.solutions';

	// Map proxy URLs to actual API endpoints
	if (proxyUrl.startsWith('/api/agents')) {
		return `${apiBase}/api/v1/workflows/run`;
	} else if (proxyUrl.startsWith('/api/secrets')) {
		// Handle secrets endpoints (may include ID)
		const path = proxyUrl.replace('/api/secrets', '/v1/secrets');
		return `${apiBase}${path}`;
	}

	// Fallback to proxy URL if not recognized
	return `${apiBase}${proxyUrl}`;
}

export async function makeApiCall(
	url: string,
	method: string,
	headers: Record<string, string>,
	body: unknown
): Promise<{ request: RequestData; response: ResponseData }> {
	// Get the actual API endpoint for display
	const actualApiUrl = getActualApiUrl(url);

	// Determine which auth header to use based on endpoint
	const isAgentCall = url.startsWith('/api/agents');
	const isSecretsCall = url.startsWith('/api/secrets');
	const authHeader = '-H "x-api-key: YOUR_API_KEY"';

	// Generate curl command with actual API endpoint (escape double quotes and backslashes for shell)
	const escapedJson = JSON.stringify(body).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	const curlCommand = `curl -X ${method} ${authHeader} -H "Content-Type: application/json" -d "${escapedJson}" ${actualApiUrl}`.trim();

	const request: RequestData = {
		url: actualApiUrl,
		method,
		headers,
		body,
		curl: curlCommand
	};

	const fetchResponse = await fetch(url, {
		method,
		headers,
		body: JSON.stringify(body)
	});

	// Get response headers
	const responseHeaders: Record<string, string> = {};
	fetchResponse.headers.forEach((value, key) => {
		responseHeaders[key] = value;
	});

	// Try to parse as JSON, fallback to text
	let responseBody: unknown;
	const contentType = fetchResponse.headers.get('content-type');
	if (contentType && contentType.includes('application/json')) {
		try {
			responseBody = await fetchResponse.json();
		} catch {
			responseBody = await fetchResponse.text();
		}
	} else {
		responseBody = await fetchResponse.text();
	}

	const response: ResponseData = {
		status: fetchResponse.status,
		statusText: fetchResponse.statusText,
		headers: responseHeaders,
		body: responseBody
	};

	return { request, response };
}

