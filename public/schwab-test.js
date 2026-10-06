const tokenKey = "trading-control-token";
const output = document.getElementById("output");
const notice = document.getElementById("notice");
const loadingState = document.getElementById("loadingState");
const loadingText = document.getElementById("loadingText");
const controls = Array.from(document.querySelectorAll("button, input"));

function setOutput(value) {
  output.textContent = JSON.stringify(value, null, 2);
}

function setNotice(message) {
  notice.textContent = message;
  notice.classList.remove("hidden");
}

function getToken() {
  return localStorage.getItem(tokenKey);
}

function setToken(token) {
  localStorage.setItem(tokenKey, token);
}

function clearToken() {
  localStorage.removeItem(tokenKey);
}

async function withLoading(message, action, trigger) {
  const originalText = trigger?.tagName === "BUTTON" ? trigger.textContent : "";

  loadingText.textContent = message;
  loadingState.classList.remove("hidden");
  document.body.classList.add("is-loading");
  controls.forEach((control) => {
    control.disabled = true;
  });

  if (trigger?.tagName === "BUTTON") {
    trigger.textContent = message;
  }

  try {
    return await action();
  } finally {
    if (trigger?.tagName === "BUTTON") {
      trigger.textContent = originalText;
    }

    controls.forEach((control) => {
      control.disabled = false;
    });
    document.body.classList.remove("is-loading");
    loadingState.classList.add("hidden");
  }
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw {
      status: response.status,
      body
    };
  }

  return body;
}

async function handleFormSubmit(event, path, loadingMessage) {
  event.preventDefault();
  const form = event.currentTarget;
  const body = Object.fromEntries(new FormData(form).entries());
  const result = await withLoading(
    loadingMessage,
    () =>
      api(path, {
        method: "POST",
        body: JSON.stringify(body)
      }),
    event.submitter
  );

  if (result.token) {
    setToken(result.token);
  }

  setOutput(result);
}

document.getElementById("registerForm").addEventListener("submit", async (event) => {
  try {
    await handleFormSubmit(event, "/auth/register", "Registering...");
  } catch (error) {
    setOutput(error);
  }
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  try {
    await handleFormSubmit(event, "/auth/login", "Logging in...");
  } catch (error) {
    setOutput(error);
  }
});

document.getElementById("meButton").addEventListener("click", async () => {
  const button = document.getElementById("meButton");

  try {
    const result = await withLoading("Checking auth...", () => api("/auth/me"), button);
    setOutput(result);
  } catch (error) {
    setOutput(error);
  }
});

document.getElementById("statusButton").addEventListener("click", async () => {
  const button = document.getElementById("statusButton");

  try {
    const result = await withLoading("Checking Schwab...", () => api("/schwab/status"), button);
    setOutput(result);
  } catch (error) {
    setOutput(error);
  }
});

document.getElementById("accountButton").addEventListener("click", async () => {
  const button = document.getElementById("accountButton");

  try {
    const result = await withLoading("Loading account...", () => api("/schwab/account"), button);
    setOutput(result);
  } catch (error) {
    setOutput(error);
  }
});

document.getElementById("connectButton").addEventListener("click", async () => {
  const button = document.getElementById("connectButton");

  try {
    const result = await withLoading("Opening Schwab...", () => api("/schwab/connect-url"), button);
    setOutput(result);
    window.location.href = result.url;
  } catch (error) {
    setOutput(error);
  }
});

document.getElementById("syncButton").addEventListener("click", async () => {
  const button = document.getElementById("syncButton");

  try {
    const result = await withLoading("Syncing trades...", () => api("/trades/sync", { method: "POST" }), button);
    setOutput(result);
  } catch (error) {
    setOutput(error);
  }
});

document.getElementById("todayButton").addEventListener("click", async () => {
  const button = document.getElementById("todayButton");

  try {
    const result = await withLoading("Loading today's trades...", () => api("/trades/today"), button);
    setOutput(result);
  } catch (error) {
    setOutput(error);
  }
});

document.getElementById("clearButton").addEventListener("click", () => {
  clearToken();
  setOutput({ tokenCleared: true });
});

const params = new URLSearchParams(window.location.search);
if (params.get("connected") === "true") {
  setNotice("Schwab OAuth callback completed. Click Schwab Status to confirm the stored token.");
}

setOutput({
  hasSavedJwt: Boolean(getToken()),
  nextStep: getToken() ? "Click Connect Schwab or Schwab Status." : "Register or login first."
});
