type FetchParams = Parameters<typeof fetch>;

export async function fetchWithAuth(
  input: FetchParams[0],
  init?: FetchParams[1],
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    window.location.href = "/login";
    return response;
  }

  return response;
}
