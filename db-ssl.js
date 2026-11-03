
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Configuration TLS MySQL pour Aiven et Render.
 * DB_SSL_CA accepte soit un certificat PEM, soit un chemin vers un fichier.
 * DB_SSL_CA_PATH accepte un chemin vers un fichier.
 */
export async function getDbSslConfig(env = process.env) {
  const sslFlag = ['true', '1', 'yes'].includes(
    String(env.DB_SSL || '').toLowerCase()
  );

  const configuredCa = String(
    env.DB_SSL_CA || env.DB_SSL_CA_PATH || ''
  ).trim();

  // Un certificat ou un chemin configuré active automatiquement TLS.
  if (!sslFlag && !configuredCa) return undefined;

  if (configuredCa) {
    const normalizedCa = configuredCa.replace(/\\n/g, '\n');

    // Cas 1 : le certificat PEM est directement dans la variable.
    if (normalizedCa.includes('-----BEGIN CERTIFICATE-----')) {
      return {
        ca: normalizedCa,
        rejectUnauthorized: true
      };
    }

    // Cas 2 : la variable contient un chemin de fichier.
    try {
      const ca = await readFile(
        resolve(process.cwd(), normalizedCa),
        'utf8'
      );

      if (!ca.includes('-----BEGIN CERTIFICATE-----')) {
        throw new Error('Certificat PEM invalide');
      }

      return {
        ca,
        rejectUnauthorized: true
      };
    } catch {
      throw new Error(
        'Impossible de charger le certificat CA MySQL. Vérifie le chemin et le fichier.'
      );
    }
  }

  // TLS avec vérification du certificat par le magasin système.
  return { rejectUnauthorized: true };
}
