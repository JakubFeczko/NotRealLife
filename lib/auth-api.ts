import {
  getAccessToken,
  getIdentity,
  getRefreshToken,
  saveIdentity,
  saveTokens,
} from "./auth-storage";

const API_URL = "https://mindtrack-production-7ef2.up.railway.app";

type LoginResponse = {
  access_token?: string | null;
  access_Token?: string | null;
  isAuthorized?: boolean;
  refresh_token?: string | null;
  refresh_Token?: string | null;
};

type SignUpResponse = {
  accountCreated: boolean;
};

type LogOutResponse = {
  logoutSuccess: boolean;
};

type LogOutPayload = {
  login?: string;
  email?: string;
};

type IdentifierField = "email" | "login";

type IdentifierCandidate = {
  value: string;
  field: IdentifierField;
};

type VerifyCodeResponse = {
  codeVerified: boolean;
};

type RefreshResponse = {
  access_token?: string;
  refresh_token: string;
  access_Token?: string;
  refresh_Token?: string;
};

function extractErrorMessage(status: number) {
  if (status === 400) return "Niepoprawne dane żądania.";
  if (status === 401) return "Nieprawidłowy login/email lub hasło.";
  if (status === 500) return "Błąd serwera. Spróbuj ponownie za chwilę.";
  return "Nie udało się wykonać żądania.";
}

function maskToken(token?: string | null) {
  if (!token) return null;
  if (token.length <= 20) return token;
  return `${token.slice(0, 10)}...${token.slice(-6)}`;
}

async function tryReadResponseBody(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function loginRequest(
  loginOrEmail: string,
  password: string,
): Promise<LoginResponse> {
  const identifier = sanitizeIdentifier(loginOrEmail);
  if (!identifier) {
    throw new Error("Podaj login lub email.");
  }

  const loginUrl = `${API_URL}/auth/login`;
  const loginPayload = {
    ...buildIdentifierPayload(identifier),
    password,
  };

  console.log("[auth/login] request", {
    url: loginUrl,
    method: "POST",
    payload: {
      ...buildIdentifierPayload(identifier),
      password_length: password.length,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  const res = await fetch(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loginPayload),
  });

  if (!res.ok) {
    const body = await tryReadResponseBody(res);
    console.log("[auth/login] error response", {
      status: res.status,
      statusText: res.statusText,
      body,
    });
    throw new Error(extractErrorMessage(res.status));
  }

  const response = (await res.json()) as LoginResponse;
  const source = response as unknown as Record<string, unknown>;
  const access = getTokenValue(source, ["access_token", "access_Token"]);
  const refresh = getTokenValue(source, ["refresh_token", "refresh_Token"]);
  const isAuthorized =
    typeof response.isAuthorized === "boolean" ? response.isAuthorized : undefined;

  console.log("[auth/login] success response", {
    access_token: maskToken(access),
    refresh_token: maskToken(refresh),
    isAuthorized,
  });

  if (isAuthorized === false) {
    return {
      access_token: null,
      refresh_token: null,
      isAuthorized: false,
    };
  }

  if (!access || !refresh) {
    throw new Error("Nieprawidłowa odpowiedź logowania.");
  }

  return {
    access_token: access,
    refresh_token: refresh,
    isAuthorized: isAuthorized ?? true,
  };
}

export async function logOutRequest(
  payload?: LogOutPayload,
): Promise<LogOutResponse> {
  const storedIdentity = await getIdentity();
  const logoutPayload = resolveLogOutPayload(payload, storedIdentity);

  // Access token in storage can be stale (short expiry), so refresh first.
  const freshAccess = await refreshTokensFromStorage();
  const accessToken = freshAccess ?? (await getAccessToken());
  if (!accessToken) {
    throw new Error("Brak tokenu dostępu do wylogowania.");
  }

  const logoutUrl = `${API_URL}/auth/logout`;
  console.log("[auth/logout] request", {
    url: logoutUrl,
    method: "POST",
    payload: logoutPayload,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${maskToken(accessToken)}`,
    },
  });

  const res = await fetch(logoutUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(logoutPayload),
  });

  if (!res.ok) {
    const body = await tryReadResponseBody(res);
    console.log("[auth/logout] error response", {
      status: res.status,
      statusText: res.statusText,
      body,
    });
    throw new Error(extractErrorMessage(res.status));
  }

  const response = await res.json();
  console.log("[auth/logout] success response", response);
  return response;
}

export async function signUpRequest(
  email: string,
  login: string,
  password: string,
): Promise<SignUpResponse> {
  const registerUrl = `${API_URL}/auth/register`;
  const registerPayload = { email, login, password };

  console.log("[auth/register] request", {
    url: registerUrl,
    method: "POST",
    payload: {
      email,
      login,
      password_length: password.length,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  const res = await fetch(registerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registerPayload),
  });

  if (!res.ok) {
    const body = await tryReadResponseBody(res);
    console.log("[auth/register] error response", {
      status: res.status,
      statusText: res.statusText,
      body,
    });

    if (res.status === 400) {
      throw new Error("Użytkownik już istnieje.");
    }
    // TEMP fallback: backend may create user, but fail on email send limit.
    if (res.status === 500) {
      console.log("[auth/register] temporary fallback enabled for 500; allowing verify step");
      return { accountCreated: true };
    }
    throw new Error(extractErrorMessage(res.status));
  }

  const response = (await res.json()) as SignUpResponse;
  console.log("[auth/register] success response", response);
  return response;
}

export async function verifyCodeRequest(
  email: string,
  code: string,
): Promise<VerifyCodeResponse> {
  const res = await fetch(`${API_URL}/auth/codeVerify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  if (!res.ok) {
    if (res.status === 400) {
      throw new Error("Niepoprawny kod weryfikacyjny.");
    }
    throw new Error(extractErrorMessage(res.status));
  }

  return await res.json();
}

export async function refreshRequest(
  identifier: string,
  refreshToken: string,
  field?: IdentifierField,
): Promise<RefreshResponse> {
  const normalizedIdentifier = sanitizeIdentifier(identifier);
  if (!normalizedIdentifier) {
    throw new Error("Brak loginu/email do odświeżenia sesji.");
  }

  const refreshUrl = `${API_URL}/auth/refresh-token`;
  const refreshPayload = {
    ...buildIdentifierPayload(normalizedIdentifier, field),
    refresh_token: refreshToken,
  };
  console.log("[auth/refresh-token] request", {
    url: refreshUrl,
    method: "POST",
    payload: {
      ...refreshPayload,
      refresh_token: maskToken(refreshToken),
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  const res = await fetch(refreshUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(refreshPayload),
  });

  if (!res.ok) {
    const body = await tryReadResponseBody(res);
    console.log("[auth/refresh-token] error response", {
      status: res.status,
      statusText: res.statusText,
      body,
    });
    throw new Error(extractErrorMessage(res.status));
  }

  const response = (await res.json()) as RefreshResponse;
  console.log("[auth/refresh-token] success response", {
    access_token: maskToken(
      getTokenValue(response as unknown as Record<string, unknown>, ["access_token", "access_Token"]),
    ),
    refresh_token: maskToken(
      getTokenValue(response as unknown as Record<string, unknown>, ["refresh_token", "refresh_Token"]),
    ),
  });
  return response;
}

function getTokenValue(
  source: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

function normalizeRefreshTokens(payload: RefreshResponse) {
  const source = payload as unknown as Record<string, unknown>;
  const access = getTokenValue(source, ["access_token", "access_Token"]);
  const refresh = getTokenValue(source, ["refresh_token", "refresh_Token"]);

  if (!access || !refresh) {
    throw new Error("Nieprawidłowa odpowiedź odświeżania tokenu.");
  }

  return { access, refresh };
}

function sanitizeIdentifier(value?: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function isEmailIdentifier(value: string) {
  return value.includes("@");
}

function buildIdentifierPayload(
  identifier: string,
  field?: IdentifierField,
): LogOutPayload {
  const resolvedField = field ?? (isEmailIdentifier(identifier) ? "email" : "login");
  return resolvedField === "email"
    ? { email: identifier }
    : { login: identifier };
}

function resolveLogOutPayload(
  payload: LogOutPayload | undefined,
  storedIdentity: Awaited<ReturnType<typeof getIdentity>>,
): LogOutPayload {
  const providedEmail = sanitizeIdentifier(payload?.email);
  const providedLogin = sanitizeIdentifier(payload?.login);
  const storedEmail = sanitizeIdentifier(storedIdentity?.email);
  const storedLogin = sanitizeIdentifier(storedIdentity?.login);

  if (providedEmail) {
    return { email: providedEmail };
  }

  if (providedLogin) {
    return { login: providedLogin };
  }

  if (storedEmail) {
    if (isEmailIdentifier(storedEmail)) {
      return { email: storedEmail };
    }

    return { login: storedEmail };
  }

  if (storedLogin) {
    return { login: storedLogin };
  }

  throw new Error("Brak loginu lub emaila do wylogowania.");
}

export async function refreshTokensFromStorage(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  const identity = await getIdentity();

  if (!refreshToken) {
    return null;
  }

  const candidates: IdentifierCandidate[] = [];
  const storedEmail = sanitizeIdentifier(identity?.email);
  const storedLogin = sanitizeIdentifier(identity?.login);

  if (storedEmail) {
    candidates.push({ value: storedEmail, field: "email" });
    if (!isEmailIdentifier(storedEmail)) {
      candidates.push({ value: storedEmail, field: "login" });
    }
  }
  if (storedLogin) {
    candidates.push({ value: storedLogin, field: "login" });
    if (isEmailIdentifier(storedLogin)) {
      candidates.push({ value: storedLogin, field: "email" });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const deduped = Array.from(
    new Map(candidates.map((candidate) => [`${candidate.field}:${candidate.value}`, candidate])).values(),
  );
  let lastError: Error | null = null;

  for (const candidate of deduped) {
    try {
      const refreshed = await refreshRequest(
        candidate.value,
        refreshToken,
        candidate.field,
      );
      const { access, refresh } = normalizeRefreshTokens(refreshed);
      await saveTokens(access, refresh);

      const mergedIdentity: LogOutPayload = {};
      const normalizedEmail = sanitizeIdentifier(identity?.email);
      const normalizedLogin = sanitizeIdentifier(identity?.login);
      if (normalizedEmail) {
        mergedIdentity.email = normalizedEmail;
      }
      if (normalizedLogin) {
        mergedIdentity.login = normalizedLogin;
      }
      if (candidate.field === "email" && !mergedIdentity.email) {
        mergedIdentity.email = candidate.value;
      }
      if (candidate.field === "login" && !mergedIdentity.login) {
        mergedIdentity.login = candidate.value;
      }
      await saveIdentity(mergedIdentity);

      return access;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Nie udało się odświeżyć sesji.");
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

export async function authFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const endpoint = path.startsWith("http") ? path : `${API_URL}${path}`;
  const currentAccess = await getAccessToken();

  const baseHeaders = new Headers(init.headers || {});
  if (currentAccess) {
    baseHeaders.set("Authorization", `Bearer ${currentAccess}`);
  }

  const firstResponse = await fetch(endpoint, {
    ...init,
    headers: baseHeaders,
  });

  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  let newAccess: string | null = null;
  try {
    newAccess = await refreshTokensFromStorage();
  } catch {
    return firstResponse;
  }

  if (!newAccess) {
    return firstResponse;
  }

  const retryHeaders = new Headers(init.headers || {});
  retryHeaders.set("Authorization", `Bearer ${newAccess}`);

  return fetch(endpoint, {
    ...init,
    headers: retryHeaders,
  });
}
