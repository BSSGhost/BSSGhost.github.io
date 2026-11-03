let isAuthorized = false;
try {
  const response = await fetch("/api/admin/me", {
    credentials: "same-origin",
    cache: "no-store"
  });
  if (response.ok) {
    const session = await response.json();
    isAuthorized = Boolean(session.user && !session.user.must_change_password);
  }
} catch {
  isAuthorized = false;
}

if (!isAuthorized) {
  window.location.replace("/admin/");
} else {
  document.body.classList.remove("auth-pending");

const FORMAT_VERSION = 1;
const APP_NAME = "SUNU MOYENNE";

const $ = (id) => document.getElementById(id);

const statusBox = $("status");
const fileInput = $("backupFile");
const previewBox = $("preview");
const restoreButton = $("restoreButton");

let importedBackup = null;

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.dataset.type = type;
}

function getEntries() {
  const entries = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === null) continue;

    const value = localStorage.getItem(key);
    if (value !== null) entries.push({ key, value });
  }

  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

function bytesOf(value) {
  return new TextEncoder().encode(value).length;
}

async function sha256(value) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("La vérification cryptographique nécessite HTTPS ou localhost.");
  }

  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function makeBackupPayload(entries, createdAt) {
  return {
    app: APP_NAME,
    formatVersion: FORMAT_VERSION,
    createdAt,
    entries
  };
}

async function buildBackup() {
  const entries = getEntries();
  const createdAt = new Date().toISOString();
  const payload = makeBackupPayload(entries, createdAt);
  const checksum = await sha256(JSON.stringify(payload));

  return { ...payload, checksum };
}

function downloadJson(data, filename) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeFilename(date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `sunu-moyenne-backup-${stamp}.json`;
}

async function createBackup() {
  try {
    setStatus("Préparation de la sauvegarde…");

    const backup = await buildBackup();
    downloadJson(backup, makeFilename(new Date(backup.createdAt)));

    const totalBytes = bytesOf(JSON.stringify(backup));
    setStatus(
      `Sauvegarde créée : ${backup.entries.length} clés, ` +
      `${(totalBytes / 1024).toFixed(1)} Ko. Conserve ce fichier en lieu sûr.`,
      "success"
    );
  } catch (error) {
    setStatus(`Échec de la sauvegarde : ${error.message}`, "error");
  }
}

function validateBackupShape(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Le fichier ne contient pas un objet JSON valide.");
  }

  if (data.app !== APP_NAME || data.formatVersion !== FORMAT_VERSION) {
    throw new Error("Ce fichier n'est pas une sauvegarde compatible de SUNU MOYENNE.");
  }

  if (!Array.isArray(data.entries) || typeof data.checksum !== "string") {
    throw new Error("La structure de la sauvegarde est incomplète.");
  }

  const seen = new Set();

  for (const entry of data.entries) {
    if (
      !entry ||
      typeof entry.key !== "string" ||
      typeof entry.value !== "string"
    ) {
      throw new Error("Une entrée de la sauvegarde est invalide.");
    }

    if (seen.has(entry.key)) {
      throw new Error(`Clé dupliquée dans la sauvegarde : ${entry.key}`);
    }

    seen.add(entry.key);
  }
}

async function verifyBackup(data) {
  validateBackupShape(data);

  const payload = makeBackupPayload(data.entries, data.createdAt);
  const expected = await sha256(JSON.stringify(payload));

  if (expected !== data.checksum) {
    throw new Error("L'empreinte SHA-256 ne correspond pas. Le fichier a pu être altéré.");
  }

  return true;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

async function inspectBackup(file) {
  importedBackup = null;
  restoreButton.disabled = true;
  previewBox.hidden = true;

  if (!file) return;

  try {
    setStatus("Lecture et vérification du fichier…");

    const text = await file.text();
    const data = JSON.parse(text);

    await verifyBackup(data);

    const currentKeys = new Set(getEntries().map((entry) => entry.key));
    const conflicts = data.entries.filter((entry) => currentKeys.has(entry.key));
    const missing = data.entries.filter((entry) => !currentKeys.has(entry.key));
    const totalBytes = bytesOf(text);

    importedBackup = data;

    $("backupDate").textContent = new Date(data.createdAt).toLocaleString("fr-FR");
    $("backupCount").textContent = String(data.entries.length);
    $("backupSize").textContent = formatBytes(totalBytes);
    $("missingCount").textContent = String(missing.length);
    $("conflictCount").textContent = String(conflicts.length);

    previewBox.hidden = false;
    restoreButton.disabled = missing.length === 0;

    setStatus(
      missing.length
        ? "Sauvegarde valide. La restauration ajoutera uniquement les clés absentes."
        : "Sauvegarde valide, mais aucune clé absente n'a été détectée.",
      "success"
    );
  } catch (error) {
    importedBackup = null;
    restoreButton.disabled = true;
    setStatus(`Fichier refusé : ${error.message}`, "error");
  }
}

async function restoreMissingEntries() {
  if (!importedBackup) return;

  const currentKeys = new Set(getEntries().map((entry) => entry.key));
  const toAdd = importedBackup.entries.filter((entry) => !currentKeys.has(entry.key));

  if (!toAdd.length) {
    setStatus("Aucune donnée à restaurer : toutes les clés existent déjà.", "info");
    return;
  }

  const confirmed = window.confirm(
    `La sauvegarde contient ${toAdd.length} clé(s) absente(s).\n\n` +
    "Une sauvegarde de l'état actuel sera téléchargée avant la restauration.\n" +
    "Les clés déjà présentes ne seront jamais remplacées.\n\n" +
    "Veux-tu continuer ?"
  );

  if (!confirmed) return;

  const insertedKeys = [];

  try {
    setStatus("Création de la sauvegarde préalable…");

    const before = await buildBackup();
    downloadJson(before, `sunu-moyenne-avant-restauration-${makeFilename()}`);

    // Laisse au navigateur le temps de déclencher le téléchargement.
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Vérification à nouveau juste avant l'écriture.
    const latestKeys = new Set(getEntries().map((entry) => entry.key));
    const safeToAdd = toAdd.filter((entry) => !latestKeys.has(entry.key));

    for (const entry of safeToAdd) {
      localStorage.setItem(entry.key, entry.value);
      insertedKeys.push(entry.key);
    }

    setStatus(
      `Restauration terminée : ${insertedKeys.length} clé(s) ajoutée(s). ` +
      "Aucune clé existante n'a été écrasée. Recharge la page principale pour vérifier les données.",
      "success"
    );

    restoreButton.disabled = true;
  } catch (error) {
    // Annule uniquement les clés ajoutées pendant cette opération.
    for (const key of insertedKeys) {
      try {
        localStorage.removeItem(key);
      } catch {
        // On poursuit le nettoyage des autres clés.
      }
    }

    setStatus(
      `Restauration interrompue : ${error.message}. ` +
      "Les clés ajoutées pendant cette opération ont été retirées autant que possible.",
      "error"
    );
  }
}

$("createBackup").addEventListener("click", createBackup);
fileInput.addEventListener("change", () => inspectBackup(fileInput.files?.[0]));
restoreButton.addEventListener("click", restoreMissingEntries);

setStatus("Prêt. Aucune donnée n'a été modifiée.");

}
