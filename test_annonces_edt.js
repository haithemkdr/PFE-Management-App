/**
 * test_annonces_edt.js
 * Tests complets pour les modules Annonces (UC-E05) et Emploi du Temps (UC-E06)
 * Usage: node test_annonces_edt.js
 */

const mysql = require('mysql2/promise');
const http = require('http');

const DB = { host: 'localhost', user: 'root', password: 'root', database: 'pfe_app' };

// ─── HTTP helper ────────────────────────────────────────────────────────────
function apiCall(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'localhost', port: 5000, path, method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: 'Bearer ' + token } : {}),
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const r = http.request(opts, res => {
            let raw = '';
            res.on('data', d => (raw += d));
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        r.on('error', reject);
        if (data) r.write(data);
        r.end();
    });
}

// ─── Assertion helper ────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(label, condition, detail = '') {
    if (condition) {
        console.log(`  ✅  ${label}`);
        passed++;
    } else {
        console.log(`  ❌  ${label}${detail ? ' — ' + detail : ''}`);
        failed++;
    }
}

// ─── DB setup ────────────────────────────────────────────────────────────────
async function ensureTables(db) {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS annonces (
            id_annonce    INT AUTO_INCREMENT PRIMARY KEY,
            id_enseignant INT NOT NULL,
            id_groupe     INT NOT NULL,
            titre         VARCHAR(255) NOT NULL,
            contenu       TEXT NOT NULL,
            date_envoi    DATETIME DEFAULT NOW(),
            FOREIGN KEY (id_enseignant) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
            FOREIGN KEY (id_groupe)     REFERENCES groupes(id_groupe)           ON DELETE CASCADE
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS emploi_du_temps (
            id_creneau     INT AUTO_INCREMENT PRIMARY KEY,
            id_affectation INT NOT NULL,
            jour           ENUM('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi') NOT NULL,
            heure_debut    TIME NOT NULL,
            heure_fin      TIME NOT NULL,
            salle          VARCHAR(50),
            type_seance    ENUM('CM','TD','TP') NOT NULL,
            FOREIGN KEY (id_affectation) REFERENCES affectations(id_affectation) ON DELETE CASCADE
        )
    `);

    // Seed schedule data only if empty
    const [rows] = await db.execute('SELECT COUNT(*) AS cnt FROM emploi_du_temps');
    if (rows[0].cnt === 0) {
        await db.execute(`
            INSERT INTO emploi_du_temps (id_affectation, jour, heure_debut, heure_fin, salle, type_seance) VALUES
            (1, 'Lundi',    '08:00:00', '09:30:00', 'Amphi A',  'CM'),
            (1, 'Mercredi', '09:30:00', '11:00:00', 'TP 04',    'TP'),
            (2, 'Mardi',    '11:00:00', '12:30:00', 'TD 02',    'TD'),
            (2, 'Mardi',    '15:00:00', '16:30:00', 'Salle 08', 'TD'),
            (3, 'Jeudi',    '08:00:00', '09:30:00', 'Amphi B',  'CM'),
            (3, 'Vendredi', '13:30:00', '15:00:00', 'TP 02',    'TP')
        `);
        console.log('  ℹ️  emploi_du_temps seeded with 6 demo slots\n');
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function run() {
    const db = await mysql.createConnection(DB);
    console.log('✔  Database connected\n');

    await ensureTables(db);
    await db.end();

    // ── Step 1: Login ──────────────────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1 — Login (benali@univ-oran.dz / prof123)');
    const login = await apiCall('POST', '/api/auth/login', {
        email: 'benali@univ-oran.dz',
        mot_de_passe: 'prof123'
    });
    assert('HTTP 200', login.status === 200, `got ${login.status}`);
    assert('Token présent', !!login.body.token);
    const token = login.body.token;
    if (!token) { console.error('\nAborting: no token.'); process.exit(1); }

    // ── Step 2: POST /api/annonces ─────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2 — POST /api/annonces (créer une annonce)');
    const post = await apiCall('POST', '/api/annonces', {
        titre: 'Devoir maison #3',
        contenu: 'Rendre le TP avant vendredi 20h.',
        id_groupe: 1
    }, token);
    assert('HTTP 201', post.status === 201, `got ${post.status}`);
    assert('success = true', post.body.success === true);
    assert('id_annonce retourné', Number.isInteger(post.body.id_annonce));
    const id_annonce = post.body.id_annonce;

    // ── Step 2b: Validation — champs manquants ─────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2b — POST /api/annonces (validation — champs manquants)');
    const badPost = await apiCall('POST', '/api/annonces', { titre: 'Titre seul' }, token);
    assert('HTTP 400 si champs manquants', badPost.status === 400, `got ${badPost.status}`);
    assert('Message d\'erreur présent', !!badPost.body.message);

    // ── Step 3: GET /api/annonces ──────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3 — GET /api/annonces (liste des annonces envoyées)');
    const get = await apiCall('GET', '/api/annonces', null, token);
    assert('HTTP 200', get.status === 200, `got ${get.status}`);
    assert('success = true', get.body.success === true);
    assert('data est un tableau', Array.isArray(get.body.data));
    assert('Au moins 1 annonce', get.body.data.length >= 1);
    if (get.body.data.length) {
        const a = get.body.data[0];
        assert('Champ titre présent', !!a.titre);
        assert('Champ groupe présent', !!a.groupe);
        assert('Champ date_envoi présent', !!a.date_envoi);
        console.log(`  ℹ️  Première annonce: "${a.titre}" → groupe ${a.groupe}`);
    }

    // ── Step 4: DELETE /api/annonces/:id ──────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`STEP 4 — DELETE /api/annonces/${id_annonce}`);
    const del = await apiCall('DELETE', `/api/annonces/${id_annonce}`, null, token);
    assert('HTTP 200', del.status === 200, `got ${del.status}`);
    assert('success = true', del.body.success === true);

    // ── Step 4b: DELETE non-existent ──────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4b — DELETE inexistant (id=99999)');
    const del404 = await apiCall('DELETE', '/api/annonces/99999', null, token);
    assert('HTTP 404 si annonce inexistante', del404.status === 404, `got ${del404.status}`);

    // ── Step 5: GET /api/emploi-du-temps/2 ────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5 — GET /api/emploi-du-temps/2 (emploi du temps)');
    const edt = await apiCall('GET', '/api/emploi-du-temps/2', null, token);
    assert('HTTP 200', edt.status === 200, `got ${edt.status}`);
    assert('success = true', edt.body.success === true);
    assert('semaine retournée', Number.isInteger(edt.body.semaine));
    assert('data est un tableau', Array.isArray(edt.body.data));
    assert('6 créneaux retournés', edt.body.data.length === 6, `got ${edt.body.data.length}`);
    if (edt.body.data.length) {
        console.log('  ℹ️  Créneaux:');
        edt.body.data.forEach(s =>
            console.log(`       ${s.jour.padEnd(10)} ${s.heure_debut} ${String(s.type_seance).padEnd(3)} — ${s.module} (${s.groupe}) — ${s.salle}`)
        );
    }

    // ── Step 5b: Access control — autre enseignant ─────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5b — GET /api/emploi-du-temps/99 (accès non autorisé)');
    const edtForbidden = await apiCall('GET', '/api/emploi-du-temps/99', null, token);
    assert('HTTP 403 si mauvais id', edtForbidden.status === 403, `got ${edtForbidden.status}`);

    // ── Summary ────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`RÉSULTAT : ${passed} ✅  passés  |  ${failed} ❌  échoués`);
    if (failed === 0) console.log('🎉  Tous les tests sont passés !');
    else console.log('⚠️  Des tests ont échoué — voir détails ci-dessus.');
}

run().catch(err => {
    console.error('\nErreur fatale :', err.message);
    process.exit(1);
});
