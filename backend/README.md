# Administration SUNU MOYENNE

L'API d'administration active est intégrée au serveur natif `server.js`. Les routes actives sont `/api/admin/login`, `/api/admin/me`, `/api/admin/logout`, `/api/admin/change-password`, `/api/admin/users` et `/api/admin/audit/logs`.

L'interface active est `admin/index.html`, servie à `/admin/`.

Les fichiers historiques `routes/admin.routes.js`, `middleware/*` et `services/*` sont conservés dans le dépôt pour référence, mais ne sont pas importés par `server.js`. Ils contiennent une ancienne architecture Express/JWT et ne doivent pas être branchés ou exécutés sans migration explicite. Le serveur actif utilise des sessions opaques stockées sous forme de hash et des mots de passe dérivés par scrypt.
