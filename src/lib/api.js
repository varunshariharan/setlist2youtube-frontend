export async function parseSetlistHtml(apiBaseUrl, htmlString){
  const response = await fetch(`${apiBaseUrl}/api/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: htmlString })
  });
  if (!response.ok){
    const text = await response.text();
    throw new Error(`Parse API error ${response.status}: ${text}`);
  }
  return await response.json();
}
