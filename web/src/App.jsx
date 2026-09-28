import { useState } from 'react'
import './App.css'

const STORAGE_KEY = 'safetybox-vault'
const PBKDF2_ITERATIONS = 250000

const encode = (value) => btoa(String.fromCharCode(...new Uint8Array(value)))
const decode = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0))

const deriveKey = async (password, salt) => {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

const encryptVault = async (entries, password, salt = crypto.getRandomValues(new Uint8Array(16))) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const data = new TextEncoder().encode(JSON.stringify(entries))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

  return { salt: encode(salt), iv: encode(iv), ciphertext: encode(ciphertext) }
}

const decryptVault = async (vault, password) => {
  const key = await deriveKey(password, decode(vault.salt))
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decode(vault.iv) },
    key,
    decode(vault.ciphertext),
  )

  return JSON.parse(new TextDecoder().decode(data))
}

const initialEntry = { name: '', username: '', password: '', url: '' }

function App() {
  const [hasVault, setHasVault] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)))
  const [unlocked, setUnlocked] = useState(false)
  const [entries, setEntries] = useState([])
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [visibleSecrets, setVisibleSecrets] = useState(new Set())
  const [newEntry, setNewEntry] = useState(initialEntry)

  const saveEntries = async (nextEntries) => {
    const existingVault = JSON.parse(localStorage.getItem(STORAGE_KEY))
    const encrypted = await encryptVault(nextEntries, password, decode(existingVault.salt))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted))
    setEntries(nextEntries)
  }

  const handleAuth = async (event) => {
    event.preventDefault()
    setError('')

    if (password.length < 10) {
      setError('Usa una contraseña maestra de al menos 10 caracteres.')
      return
    }

    if (!hasVault && password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setBusy(true)
    try {
      const storedVault = localStorage.getItem(STORAGE_KEY)
      const nextEntries = storedVault ? await decryptVault(JSON.parse(storedVault), password) : []

      if (!storedVault) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(await encryptVault([], password)))
        setHasVault(true)
      }

      setEntries(nextEntries)
      setUnlocked(true)
      setPassword('')
      setConfirmation('')
    } catch {
      setError('No se pudo abrir la bóveda. Revisa tu contraseña maestra.')
    } finally {
      setBusy(false)
    }
  }

  const handleLock = () => {
    setUnlocked(false)
    setEntries([])
    setVisibleSecrets(new Set())
  }

  const handleAddEntry = async (event) => {
    event.preventDefault()
    if (!newEntry.name.trim() || !newEntry.password) return

    setBusy(true)
    try {
      await saveEntries([...entries, { ...newEntry, id: crypto.randomUUID() }])
      setNewEntry(initialEntry)
      setShowForm(false)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id) => {
    setBusy(true)
    try {
      await saveEntries(entries.filter((entry) => entry.id !== id))
    } finally {
      setBusy(false)
    }
  }

  const toggleSecret = (id) => {
    setVisibleSecrets((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredEntries = entries.filter((entry) =>
    `${entry.name} ${entry.username} ${entry.url}`.toLowerCase().includes(search.toLowerCase()),
  )

  if (!unlocked) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="brand-mark">S<span>/</span>B</div>
          <p className="eyebrow">SAFETYBOX / PRIVATE VAULT</p>
          <h1 id="auth-title">Tus claves, bajo tu control.</h1>
          <p className="auth-copy">Una bóveda local para guardar credenciales cifradas. La contraseña maestra nunca se almacena.</p>
          <form onSubmit={handleAuth} className="auth-form">
            <label htmlFor="master-password">Contraseña maestra</label>
            <input id="master-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 10 caracteres" autoComplete={hasVault ? 'current-password' : 'new-password'} required />
            {!hasVault && <>
              <label htmlFor="confirm-password">Repite la contraseña</label>
              <input id="confirm-password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirma tu contraseña maestra" autoComplete="new-password" required />
            </>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Abriendo bóveda...' : hasVault ? 'Desbloquear bóveda' : 'Crear bóveda'}</button>
          </form>
          <p className="security-note"><span aria-hidden="true">◎</span> Cifrado AES-GCM de 256 bits en tu navegador</p>
        </section>
        <aside className="auth-aside">
          <p className="aside-number">01</p>
          <p>Private by default.</p>
          <p className="aside-detail">Tus datos permanecen en este dispositivo hasta que decidamos juntos cómo sincronizarlos.</p>
        </aside>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="wordmark"><span className="brand-mark small">S<span>/</span>B</span> SAFETYBOX</div>
        <div className="topbar-actions"><span className="encrypted-status"><span /> Cifrado local</span><button type="button" className="text-button" onClick={handleLock}>Bloquear</button></div>
      </header>
      <div className="app-layout">
        <aside className="sidebar">
          <p className="sidebar-label">TU ESPACIO</p>
          <button type="button" className="nav-item active"><span>▦</span> Todas las claves <strong>{entries.length}</strong></button>
          <button type="button" className="nav-item"><span>☆</span> Favoritas <strong>0</strong></button>
          <div className="sidebar-footer"><p>ALMACENAMIENTO</p><div className="storage-meter"><span /></div><small>{entries.length} de 100 registros</small></div>
        </aside>
        <section className="vault-content">
          <div className="content-heading"><div><p className="eyebrow">MI BÓVEDA / 01</p><h1>Tus claves</h1><p className="muted">Todo lo importante, en un solo lugar.</p></div><button type="button" className="primary-button add-button" onClick={() => setShowForm(true)}>+ Añadir clave</button></div>
          <div className="toolbar"><label className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en tu bóveda..." aria-label="Buscar en tu bóveda" /></label><span className="entry-count">{filteredEntries.length} {filteredEntries.length === 1 ? 'registro' : 'registros'}</span></div>
          {filteredEntries.length === 0 ? <div className="empty-state"><div className="empty-icon">+</div><h2>{entries.length ? 'No encontramos esa clave' : 'Tu bóveda está vacía'}</h2><p>{entries.length ? 'Prueba con otro nombre o usuario.' : 'Añade tu primera credencial para empezar a protegerla.'}</p>{!entries.length && <button type="button" className="secondary-button" onClick={() => setShowForm(true)}>Añadir primera clave</button>}</div> : <div className="entry-grid">{filteredEntries.map((entry) => <article className="entry-card" key={entry.id}><div className="entry-top"><div className="site-icon">{entry.name.slice(0, 1).toUpperCase()}</div><div className="entry-title"><h2>{entry.name}</h2><p>{entry.username || 'Sin usuario'}</p></div><button type="button" className="icon-button" onClick={() => handleDelete(entry.id)} aria-label={`Eliminar ${entry.name}`} title="Eliminar">×</button></div><div className="secret-row"><span>{visibleSecrets.has(entry.id) ? entry.password : '••••••••••••'}</span><button type="button" className="reveal-button" onClick={() => toggleSecret(entry.id)}>{visibleSecrets.has(entry.id) ? 'Ocultar' : 'Mostrar'}</button></div><div className="card-footer"><button type="button" className="copy-button" onClick={() => navigator.clipboard.writeText(entry.password)}>Copiar clave</button>{entry.url && <span className="entry-url">{entry.url.replace(/^https?:\/\//, '')}</span>}</div></article>)}</div>}
        </section>
      </div>
      {showForm && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><p className="eyebrow">NUEVO REGISTRO</p><h2 id="modal-title">Añadir una clave</h2></div><button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="Cerrar">×</button></div><form className="entry-form" onSubmit={handleAddEntry}><label>Nombre del servicio<input value={newEntry.name} onChange={(event) => setNewEntry({ ...newEntry, name: event.target.value })} placeholder="Ej. Correo personal" required /></label><label>Usuario o correo<input value={newEntry.username} onChange={(event) => setNewEntry({ ...newEntry, username: event.target.value })} placeholder="tu@correo.com" /></label><label>Contraseña<input type="password" value={newEntry.password} onChange={(event) => setNewEntry({ ...newEntry, password: event.target.value })} placeholder="Introduce la clave" required /></label><label>URL <span className="optional">opcional</span><input value={newEntry.url} onChange={(event) => setNewEntry({ ...newEntry, url: event.target.value })} placeholder="https://..." /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar clave'}</button></div></form></section></div>}
    </main>
  )
}

export default App
