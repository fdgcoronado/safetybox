import { useEffect, useState } from "react";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import logoUrl from "./logo.svg";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const PBKDF2_ITERATIONS = Number(import.meta.env.VITE_PBKDF2_ITERATIONS);
const TRANSPORT_KEY_SALT =
  import.meta.env.VITE_TRANSPORT_KEY_SALT;

const encode = (value) => btoa(String.fromCharCode(...new Uint8Array(value)));
const decode = (value) =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const deriveTransportKey = async (token) => {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(TRANSPORT_KEY_SALT),
      iterations: 200000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const encryptTransportPayload = async (payload, token) => {
  const key = await deriveTransportKey(token);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );

  return {
    version: "safetybox-json-v1",
    iv: encode(iv),
    ciphertext: encode(new Uint8Array(ciphertext)),
  };
};

const decryptTransportPayload = async (payload, token) => {
  const key = await deriveTransportKey(token);
  const data = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(payload.iv) },
    key,
    decode(payload.ciphertext),
  );

  return JSON.parse(new TextDecoder().decode(data));
};

const deriveKey = async (password, salt) => {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const encryptVault = async (
  entries,
  password,
  salt = crypto.getRandomValues(new Uint8Array(16)),
) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const data = new TextEncoder().encode(JSON.stringify(entries));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );

  return { salt: encode(salt), iv: encode(iv), ciphertext: encode(ciphertext) };
};

const decryptVault = async (vault, password) => {
  const key = await deriveKey(password, decode(vault.salt));
  const data = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(vault.iv) },
    key,
    decode(vault.ciphertext),
  );

  return JSON.parse(new TextDecoder().decode(data));
};

const initialEntry = { name: "", username: "", password: "", url: "", favorite: false };

function App() {
  const [session, setSession] = useState(null);
  const [hasVault, setHasVault] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries] = useState([]);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [favoriteFilter, setFavoriteFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [visibleSecrets, setVisibleSecrets] = useState(new Set());
  const [newEntry, setNewEntry] = useState(initialEntry);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const refreshVaultState = async () => {
    if (!session?.accessToken) {
      setEntries([]);
      setUnlocked(false);
      setHasVault(false);
      return;
    }

    try {
      const remoteEntries = await apiRequest("/vault/entries");
      if (Array.isArray(remoteEntries)) {
        setHasVault(true);
        setEntries(remoteEntries);
        return;
      }
    } catch {
      setEntries([]);
    }

    setHasVault(false);
    setEntries([]);
  };

  useEffect(() => {
    if (!session?.accessToken) {
      setEntries([]);
      setUnlocked(false);
      setHasVault(false);
      return;
    }

    refreshVaultState();
  }, [session?.accessToken]);

  const apiRequest = async (path, options = {}) => {
    const token = session?.accessToken;
    const requestOptions = { ...options };

    if (requestOptions.body && token) {
      const parsedBody = typeof requestOptions.body === "string"
        ? JSON.parse(requestOptions.body)
        : requestOptions.body;

      requestOptions.body = JSON.stringify(
        await encryptTransportPayload(parsedBody, token),
      );
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...requestOptions,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || "La petición a la API falló.");
    }

    if (payload?.version === "safetybox-json-v1" && token) {
      return decryptTransportPayload(payload, token);
    }

    return payload;
  };

  const saveEntries = async (nextEntries) => {
    if (session?.accessToken) {
      await apiRequest("/vault/entries", {
        method: "PUT",
        body: JSON.stringify(nextEntries),
      });
    }

    setEntries(nextEntries);
    setHasVault(true);
  };

  const handleJwtAuth = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthBusy(true);

    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        cache: "no-store",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || "No se pudo autenticar con la API.");
      }

      setSession({ accessToken: payload.accessToken, user: payload.user });
      setUnlocked(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (error) {
      setAuthError(error.message || "No se pudo conectar con el backend.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Usa una llave maestra de al menos 10 caracteres.");
      return;
    }

    if (!hasVault && password !== confirmation) {
      setError("Las llaves maestras no coinciden.");
      return;
    }

    setBusy(true);
    try {
      let nextEntries = [];
      let vaultExists = hasVault;

      if (session?.accessToken) {
        try {
          const remoteEntries = await apiRequest("/vault/entries");
          if (Array.isArray(remoteEntries)) {
            nextEntries = remoteEntries;
            vaultExists = true;
          }
        } catch {
          nextEntries = [];
          vaultExists = false;
        }
      }

      if (session?.accessToken && !vaultExists) {
        await apiRequest("/vault/entries", {
          method: "PUT",
          body: JSON.stringify([]),
        });
        vaultExists = true;
      }

      setHasVault(vaultExists);
      setEntries(nextEntries);
      setUnlocked(true);
      setPassword("");
      setConfirmation("");
    } catch (error) {
      setError(
        error.message || "No se pudo abrir la bóveda. Revisa tu llave maestra.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleLock = () => {
    setSession(null);
    setUnlocked(false);
    setEntries([]);
    setVisibleSecrets(new Set());
    setAuthError("");
    setHasVault(false);
  };

  const handleAddEntry = async (event) => {
    event.preventDefault();
    if (!newEntry.name.trim() || !newEntry.password) return;

    setBusy(true);
    try {
      await saveEntries([...entries, { ...newEntry, id: crypto.randomUUID() }]);
      setNewEntry(initialEntry);
      setShowForm(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (id) => {
    const entryToDelete = entries.find((entry) => entry.id === id);
    setDeleteTarget(entryToDelete || null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setBusy(true);
    try {
      await saveEntries(entries.filter((entry) => entry.id !== deleteTarget.id));
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  };

  const toggleSecret = (id) => {
    setVisibleSecrets((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFavorite = async (id) => {
    const nextEntries = entries.map((entry) =>
      entry.id === id ? { ...entry, favorite: !entry.favorite } : entry,
    );

    await saveEntries(nextEntries);
  };

  const favoriteEntries = entries.filter((entry) => entry.favorite);
  const visibleEntries =
    favoriteFilter === "favorites"
      ? favoriteEntries
      : entries;

  const filteredEntries = visibleEntries.filter((entry) =>
    `${entry.name} ${entry.username} ${entry.url}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  if (!session?.accessToken) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="brand-row">
            <img src={logoUrl} alt="SafetyBox logo" className="brand-mark" />
            <span className="brand-text">SAFETYBOX</span>
          </div>
          <h1 id="auth-title">Accede a tu bóveda segura.</h1>
          <p className="auth-copy">
            Inicia sesión con tu cuenta de SafetyBox o crea una nueva con JWT.
          </p>

          <div className="auth-mode-toggle" role="tablist" aria-label="Modo de autenticación">
            <button
              type="button"
              className={authMode === "login" ? "tab-button active" : "tab-button"}
              onClick={() => setAuthMode("login")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={authMode === "register" ? "tab-button active" : "tab-button"}
              onClick={() => setAuthMode("register")}
            >
              Registrarme
            </button>
          </div>

          <form onSubmit={handleJwtAuth} className="auth-form">
            <label htmlFor="auth-email">Correo electrónico</label>
            <input
              id="auth-email"
              type="email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder="tucuenta@correo.com"
              autoComplete="email"
              required
            />

            <label htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder="Tu contraseña"
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
              required
            />

            {authError && (
              <p className="form-error" role="alert">
                {authError}
              </p>
            )}

            <button className="primary-button" type="submit" disabled={authBusy}>
              {authBusy
                ? authMode === "login"
                  ? "Entrando..."
                  : "Creando cuenta..."
                : authMode === "login"
                  ? "Iniciar sesión"
                  : "Crear cuenta"}
            </button>
          </form>

          <p className="security-note">
            <span aria-hidden="true">◎</span> API: {API_BASE_URL}
          </p>
        </section>
        <aside className="auth-aside">
          <div className="vault-illustration" aria-label="Bóveda bancaria">
            <div className="vault-image" />
          </div>
        </aside>
      </main>
    );
  }

  if (!unlocked) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="brand-row">
            <img src={logoUrl} alt="SafetyBox logo" className="brand-mark" />
            <span className="brand-text">SAFETYBOX</span>
          </div>
          <h1 id="auth-title">Tus credenciales, bajo tu control.</h1>
          <p className="auth-copy">
            Una bóveda local para guardar credenciales cifradas. La llave
            maestra nunca se almacena.
          </p>
          <form onSubmit={handleAuth} className="auth-form">
            <label htmlFor="master-password">Llave maestra</label>
            <input
              id="master-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 10 caracteres"
              autoComplete={hasVault ? "current-password" : "new-password"}
              required
            />
            {!hasVault && (
              <>
                <label htmlFor="confirm-password">Repite la llave maestra</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Confirma tu llave maestra"
                  autoComplete="new-password"
                  required
                />
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button" type="submit" disabled={busy}>
              {busy
                ? "Abriendo bóveda..."
                : hasVault
                  ? "Desbloquear bóveda"
                  : "Crear bóveda"}
            </button>
          </form>
          <p className="security-note">
            <span aria-hidden="true">◎</span> Cifrado AES-GCM de 256 bits en tu
            navegador
          </p>
        </section>
        <aside className="auth-aside">
          <div className="vault-illustration" aria-label="Bóveda bancaria">
            <div className="vault-image" />
          </div>
        </aside>
      </main>
    );
  }

  return (
    <Box className="app-shell">
      <AppBar
        position="static"
        elevation={0}
        color="transparent"
        component="header"
        className="topbar"
      >
        <Toolbar disableGutters className="topbar-toolbar">
          <div className="wordmark">
            <img src={logoUrl} alt="SafetyBox logo" className="brand-mark small" />
            SAFETYBOX
          </div>
          <div className="topbar-actions">
            <span className="encrypted-status">
              <span /> {session.user?.email || "Usuario"}
            </span>
            <Button
              type="button"
              className="text-button"
              onClick={handleLock}
              sx={{
                minWidth: 0,
                padding: 0,
                color: "var(--coral)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        </Toolbar>
      </AppBar>
      <Box component="main" className="app-layout">
        <aside className="sidebar">
          <p className="sidebar-label">TU ESPACIO</p>
          <button
            type="button"
            className={favoriteFilter === "all" ? "nav-item active" : "nav-item"}
            onClick={() => setFavoriteFilter("all")}
          >
            <span>▦</span> Todas las credenciales <strong>{entries.length}</strong>
          </button>
          <button
            type="button"
            className={favoriteFilter === "favorites" ? "nav-item active" : "nav-item"}
            onClick={() => setFavoriteFilter("favorites")}
          >
            <span>☆</span> Favoritas <strong>{favoriteEntries.length}</strong>
          </button>

          {favoriteEntries.length > 0 && (
            <div className="favorites-list" aria-label="Credenciales favoritas">
              {favoriteEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={
                    favoriteFilter === "favorites" && filteredEntries.some((item) => item.id === entry.id)
                      ? "favorite-entry selected"
                      : "favorite-entry"
                  }
                  onClick={() => {
                    setFavoriteFilter("favorites");
                    setSearch(entry.name);
                  }}
                >
                  <span className="favorite-entry-dot">★</span>
                  <span className="favorite-entry-text">{entry.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="sidebar-footer">
            <p>ALMACENAMIENTO</p>
            <div className="storage-meter">
              <span />
            </div>
            <small>{entries.length} de 100 registros</small>
          </div>
        </aside>
        <section className="vault-content">
          <div className="content-heading">
            <div>
              <p className="eyebrow">MI BÓVEDA / 01</p>
              <h1>Tus credenciales</h1>
              <p className="muted">Todo lo importante, en un solo lugar.</p>
            </div>
            <button
              type="button"
              className="primary-button add-button"
              onClick={() => setShowForm(true)}
            >
              + Añadir credencial
            </button>
          </div>
          <div className="toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar en tu bóveda..."
                aria-label="Buscar en tu bóveda"
              />
            </label>
            <span className="entry-count">
              {filteredEntries.length}{" "}
              {filteredEntries.length === 1 ? "registro" : "registros"}
            </span>
          </div>
          {filteredEntries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">+</div>
              <h2>
                {entries.length
                  ? "No encontramos esa credencial"
                  : "Tu bóveda está vacía"}
              </h2>
              <p>
                {entries.length
                  ? "Prueba con otro nombre o usuario."
                  : "Añade tu primera credencial para empezar a protegerla."}
              </p>
              {!entries.length && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(true)}
                >
                  Añadir primera credencial
                </button>
              )}
            </div>
          ) : (
            <div className="entry-grid">
              {filteredEntries.map((entry) => (
                <article className="entry-card" key={entry.id}>
                  <div className="entry-top">
                    <div className="site-icon">
                      {entry.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="entry-title">
                      <h2>{entry.name}</h2>
                      <p>{entry.username || "Sin usuario"}</p>
                    </div>
                    <button
                      type="button"
                      className={entry.favorite ? "favorite-button active" : "favorite-button"}
                      onClick={() => toggleFavorite(entry.id)}
                      aria-label={entry.favorite ? `Quitar ${entry.name} de favoritas` : `Marcar ${entry.name} como favorita`}
                      title={entry.favorite ? "Quitar de favoritas" : "Marcar como favorita"}
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDelete(entry.id)}
                      aria-label={`Eliminar ${entry.name}`}
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                  <div className="secret-row">
                    <span>
                      {visibleSecrets.has(entry.id)
                        ? entry.password
                        : "••••••••••••"}
                    </span>
                    <button
                      type="button"
                      className="reveal-button"
                      onClick={() => toggleSecret(entry.id)}
                    >
                      {visibleSecrets.has(entry.id) ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <div className="card-footer">
                    <button
                      type="button"
                      className="copy-button"
                      onClick={() =>
                        navigator.clipboard.writeText(entry.password)
                      }
                    >
                      Copiar credencial
                    </button>
                    {entry.url && (
                      <a
                        className="entry-url"
                        href={entry.url.startsWith("http://") || entry.url.startsWith("https://") ? entry.url : `https://${entry.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={entry.url}
                      >
                        {entry.url.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </Box>
      <Box component="footer" className="app-footer">
        <Typography component="p" variant="caption">
          {new Date().getFullYear()} · SafetyBox
        </Typography>
      </Box>
      {deleteTarget && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">ELIMINAR CREDENCIAL</p>
                <h2 id="delete-title">¿Eliminar esta entrada?</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDeleteTarget(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <p className="delete-warning">
              Se eliminará <strong>{deleteTarget.name}</strong> y no podrás recuperarla después.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={confirmDelete}
                disabled={busy}
              >
                {busy ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </section>
        </div>
      )}
      {showForm && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">NUEVO REGISTRO</p>
                <h2 id="modal-title">Añadir una credencial</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowForm(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <form className="entry-form" onSubmit={handleAddEntry}>
              <label>
                Nombre del servicio
                <input
                  value={newEntry.name}
                  onChange={(event) =>
                    setNewEntry({ ...newEntry, name: event.target.value })
                  }
                  placeholder="Ej. Correo personal"
                  required
                />
              </label>
              <label>
                Usuario o correo
                <input
                  value={newEntry.username}
                  onChange={(event) =>
                    setNewEntry({ ...newEntry, username: event.target.value })
                  }
                  placeholder="tu@correo.com"
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  value={newEntry.password}
                  onChange={(event) =>
                    setNewEntry({ ...newEntry, password: event.target.value })
                  }
                  placeholder="Introduce la credencial"
                  required
                />
              </label>
              <label>
                URL <span className="optional">opcional</span>
                <input
                  value={newEntry.url}
                  onChange={(event) =>
                    setNewEntry({ ...newEntry, url: event.target.value })
                  }
                  placeholder="https://..."
                />
              </label>
              <label className="favorite-toggle">
                <input
                  type="checkbox"
                  checked={newEntry.favorite}
                  onChange={(event) =>
                    setNewEntry({ ...newEntry, favorite: event.target.checked })
                  }
                />
                Marcar como favorita
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? "Guardando..." : "Guardar credencial"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Box>
  );
}

export default App;
