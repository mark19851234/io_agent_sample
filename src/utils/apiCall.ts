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

export async function makeApiCall(
	url: string,
	method: string,
	headers: Record<string, string>,
	body: unknown
): Promise<{ request: RequestData; response: ResponseData }> {
	// Generate curl command (escape double quotes and backslashes for shell)
	const escapedJson = JSON.stringify(body).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	const curlCommand = `curl -X ${method} -H "Content-Type: application/json" -d "${escapedJson}" ${window.location.origin}${url}`;

	const request: RequestData = {
		url: `${window.location.origin}${url}`,
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

