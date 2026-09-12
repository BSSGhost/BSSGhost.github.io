/* =========================================================
   BULLETIN-AUTH — authentification des bulletins (QR)
   ---------------------------------------------------------
   Site statique (pas de serveur) : le QR code apposé sur un
   bulletin encode un « payload » JSON compressé + un checksum
   (FNV-1a 64 bits, calculé hors ligne côté client). La page
   de vérification (verification.html) rejoue ce checksum et
   affiche le contenu du bulletin : on peut ainsi détecter si
   le document a été modifié après émission.

   LIMITE HONNÊTE : sans backend, le checksum garantit
   l'INTÉGRITÉ du contenu (détection de modification), pas
   son ORIGINE. Une authentification cryptographique sûre
   exigerait un serveur signant les bulletins.
   ========================================================= */
"use strict";

(function (global) {
  // --- FNV-1a 64 bits (implémenté en arithmétique BigInt) ---
  const FNV_OFFSET = 0xcbf29ce484222325n;
  const FNV_PRIME = 0x100000001b3n;
  const MASK64 = 0xffffffffffffffffn;

  function fnv1a64(str) {
    let hash = FNV_OFFSET;
    for (let i = 0; i < str.length; i++) {
      hash ^= BigInt(str.charCodeAt(i) & 0xff);
      hash = (hash * FNV_PRIME) & MASK64;
    }
    return hash.toString(16).padStart(16, "0");
  }

  // --- Tri canonique récursif des clés (JSON stable) ---
  function sortKeysDeep(value) {
    if (Array.isArray(value)) {
      return value.map(sortKeysDeep);
    }
    if (value && typeof value === "object") {
      const out = {};
      Object.keys(value)
        .sort()
        .forEach(function (k) {
          out[k] = sortKeysDeep(value[k]);
        });
      return out;
    }
    return value;
  }

  function canonString(payload) {
    return JSON.stringify(sortKeysDeep(payload));
  }

  // --- Encodage Base64URL (sûr pour une query string / QR) ---
  function bytesToBase64Url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function strToBytes(str) {
    return new TextEncoder().encode(str);
  }

  function base64UrlToJson(b64) {
    const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4;
    const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  /**
   * Construit le payload final (trié + checksum) puis son URL de QR.
   * @param {object} fields  champs du bulletin (élève, classe, semestre,
   *   moyennes par matière, moyenne générale, mention, émis le…)
   * @returns {{ checksum: string, payload: object, url: string }}
   */
  function buildPayload(fields) {
    const data = sortKeysDeep(fields);
    const payloadWithSum = Object.assign({}, data);
    payloadWithSum.checksum = fnv1a64(canonString(data));
    return {
      checksum: payloadWithSum.checksum,
      payload: payloadWithSum
    };
  }

  /** Rejoue le checksum : true = contenu intact. */
  function verify(payload) {
    if (!payload || typeof payload !== "object") return false;
    const recorded = payload.checksum;
    if (typeof recorded !== "string" || recorded.length !== 16) return false;
    const data = Object.assign({}, payload);
    delete data.checksum;
    return fnv1a64(canonString(data)) === recorded;
  }

  /** URL de vérification qui encode le payload (à mettre dans le QR). */
  function verificationUrl(payload) {
    const bytes = strToBytes(JSON.stringify(payload));
    const base =
      global.location && global.location.pathname
        ? global.location.href.replace(/[^/]*$/, "")
        : "";
    return base + "verification.html?d=" + bytesToBase64Url(bytes);
  }

  global.BulletinAuth = {
    fnv1a64,
    canonString,
    buildPayload,
    verify,
    verificationUrl,
    base64UrlToJson
  };
})(window);