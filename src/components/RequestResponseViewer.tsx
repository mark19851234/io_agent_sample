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

type RequestResponseViewerProps = {
	request: RequestData | null;
	response: ResponseData | null;
	bestEffortOutput?: string;
};

export function RequestResponseViewer({ request, response, bestEffortOutput }: RequestResponseViewerProps) {
	return (
		<>
			{request && (
				<section className="card">
					<h2>Request</h2>
					<div style={{ marginBottom: '12px' }}>
						<div style={{ marginBottom: '8px' }}>
							<strong>URL:</strong> <code style={{ color: '#63e6be' }}>{request.url}</code>
						</div>
						<div style={{ marginBottom: '8px' }}>
							<strong>Method:</strong> <code style={{ color: '#63e6be' }}>{request.method}</code>
						</div>
						<div style={{ marginBottom: '8px' }}>
							<strong>Headers:</strong>
							<pre className="pre" style={{ marginTop: '4px', fontSize: '12px' }}>{JSON.stringify(request.headers, null, 2)}</pre>
						</div>
						<div style={{ marginBottom: '8px' }}>
							<strong>Body:</strong>
							<pre className="pre" style={{ marginTop: '4px' }}>{JSON.stringify(request.body, null, 2)}</pre>
						</div>
						<div>
							<strong>cURL Command:</strong>
							<pre className="pre" style={{ marginTop: '4px', fontSize: '12px', wordBreak: 'break-all' }}>{request.curl}</pre>
						</div>
					</div>
				</section>
			)}

			{bestEffortOutput && (
				<section className="card">
					<h2>Result (best-effort)</h2>
					<div className="summary">{bestEffortOutput}</div>
				</section>
			)}

			{response && (
				<section className="card">
					<h2>Response</h2>
					<div style={{ marginBottom: '12px' }}>
						<div style={{ marginBottom: '8px' }}>
							<strong>Status:</strong>{' '}
							<code style={{ color: response.status >= 200 && response.status < 300 ? '#63e6be' : '#ff6b6b' }}>
								{response.status} {response.statusText}
							</code>
						</div>
						{Object.keys(response.headers).length > 0 && (
							<div style={{ marginBottom: '8px' }}>
								<strong>Headers:</strong>
								<pre className="pre" style={{ marginTop: '4px', fontSize: '12px' }}>{JSON.stringify(response.headers, null, 2)}</pre>
							</div>
						)}
						<div>
							<strong>Body:</strong>
							<pre className="pre" style={{ marginTop: '4px' }}>
								{typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2)}
							</pre>
						</div>
					</div>
				</section>
			)}
		</>
	);
}




