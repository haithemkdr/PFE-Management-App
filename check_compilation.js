const db = require('./config/db');

async function check() {
  const [aff] = await db.query(
    `SELECT a.id_affectation, a.id_module, a.id_groupe, m.nom_module, a.type_seance, g.libelle as nom_groupe, g.section
     FROM affectations a
     JOIN modules m ON a.id_module = m.id_module
     LEFT JOIN groupes g ON a.id_groupe = g.id_groupe
     WHERE m.nom_module = 'Compilation'`
  );
  console.log('Compilation affectations:', JSON.stringify(aff, null, 2));

  // Check absences for affectation 414 by date
  const [abs414] = await db.query(
    `SELECT date_seance, statut, COUNT(*) as cnt FROM absences WHERE id_affectation = 414 GROUP BY date_seance, statut`
  );
  console.log('\nAbsences for aff 414:', JSON.stringify(abs414, null, 2));

  // Get the group with id 44
  const [g44] = await db.query('SELECT * FROM groupes WHERE id_groupe = 44');
  console.log('\nGroup 44:', JSON.stringify(g44, null, 2));

  // Get ALL absences with module info
  const [allAbs] = await db.query(
    `SELECT a.id_affectation, aff.id_module, m.nom_module, aff.id_groupe, g.libelle,
            a.date_seance, a.statut, COUNT(*) as cnt
     FROM absences a
     JOIN affectations aff ON a.id_affectation = aff.id_affectation
     JOIN modules m ON aff.id_module = m.id_module
     LEFT JOIN groupes g ON aff.id_groupe = g.id_groupe
     GROUP BY a.id_affectation, a.date_seance, a.statut
     ORDER BY m.nom_module, a.date_seance`
  );
  console.log('\nAll absences by module:', JSON.stringify(allAbs, null, 2));

  // EDT for compilation
  const affIds = aff.map(a => a.id_affectation);
  if (affIds.length > 0) {
    const [edt] = await db.query(
      `SELECT e.id_affectation, e.jour, e.heure_debut, e.heure_fin, e.salle, e.type_seance
       FROM emploi_du_temps e WHERE e.id_affectation IN (?)`,
      [affIds]
    );
    console.log('\nEDT for Compilation:', JSON.stringify(edt, null, 2));
  }

  // sessions table
  const [sess] = await db.query('SELECT * FROM sessions');
  console.log('\nSessions table:', JSON.stringify(sess, null, 2));

  process.exit(0);
}

check();
