export async function readAssessorResponse(response: Response) {
  const reference = response.headers.get('cf-ray');
  const suffix = ` (HTTP ${response.status}${reference ? `; reference ${reference}` : ''})`;
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error(`County lookup received an unexpected webpage instead of data${suffix}. Your Google details are saved. Retry the county lookup.`);
  }
  let result: any;
  try { result = await response.json(); }
  catch { throw new Error(`County lookup returned unreadable data${suffix}. Your Google details are saved. Please retry.`); }
  if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : `County lookup failed${suffix}. Please retry.`);
  if (!result?.assessor || typeof result.assessor.fields !== 'object' || !result.assessor.fields || Array.isArray(result.assessor.fields)) {
    throw new Error(`County lookup returned incomplete data${suffix}. Please retry.`);
  }
  return result;
}
