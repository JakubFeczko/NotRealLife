const API_URL = "https://mindtrack-production-7ef2.up.railway.app";

type LoginResponse = {
  access_token: string;
  refresh_token: string;
};

type signUpRequest ={
  accountCreated: boolean;
};

type verifyEmailResponse = {
  codeVerified: boolean;
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
};

export async function signUpRequest(email: string, login: string, password: string): Promise<signUpRequest> {
  console.log("Rejestracja użytkownika:", email, login, password);
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, login, password }),
  });


  console.log("Response status:", res);

  if (!res.ok) {
    throw new Error("Nie udało się zarejestrować użytkownika");
  }

  return await res.json();
}

export async function verifyEmailResponse(email: string, code: string) {
  console.log("Weryfikacja kodu dla:", email, code);
  const res = await fetch(`${API_URL}/auth/codeVerify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  console.log("Response status:", res);

  if (!res.ok) {
    throw new Error("Invalid code");
  }

  return res.json();
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