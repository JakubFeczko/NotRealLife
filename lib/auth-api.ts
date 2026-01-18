const API_URL = "https://mindtrack-production-7ef2.up.railway.app";

type LoginResponse = {
  access_token: string;
};

type RefreshResponse = {
  refresh_token: string;
};

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

if (!res.ok) {
  throw new Error("Nieprawidłowy email lub hasło");
}

  return await res.json();
}

export async function refreshRequest(accessToken: string) {
  const res = await fetch(`${API_URL}/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Nie udało się odświeżyć sesji");
  }

  return (await res.json()) as RefreshResponse;
}