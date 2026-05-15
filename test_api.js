const http = require('http');

const BASE_URL = 'http://localhost:5000/api';
let token = '';

// Helper to make API requests
async function makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        
        // For debugging, if content type is not JSON or response is empty
        const contentType = response.headers.get("content-type");
        let data;
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        return {
            status: response.status,
            ok: response.ok,
            data
        };
    } catch (error) {
        console.error(`❌ Connection error to ${url}:`, error.message);
        return { status: 500, ok: false, error: error.message };
    }
}

// Format test output
function printTestResult(testName, result) {
    if (result.ok) {
        console.log(`✅ [SUCCESS] ${testName} (Status: ${result.status})`);
        console.log(`   Response:`, typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : result.data);
    } else {
        console.log(`❌ [FAILED]  ${testName} (Status: ${result.status})`);
        console.log(`   Error:`, typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : result.data || result.error);
    }
    console.log('--------------------------------------------------');
}

async function runTests() {
    console.log("==================================================");
    console.log("🚀 STARTING API TESTS (PFE_Application)");
    console.log("==================================================\n");

    // 1. Test Server Status
    const statusRes = await makeRequest('/status');
    printTestResult('GET /api/status - Server Check', statusRes);

    // 2. Test Login
    // Note: Change these credentials to valid ones in your database if necessary
    const loginPayload = {
        email: "benali@univ-oran.dz", // Adjust based on your test DB
        mot_de_passe: "admin123"  // Adjust based on your test DB
    };
    const loginRes = await makeRequest('/auth/login', 'POST', loginPayload);
    printTestResult('POST /api/auth/login - Authentication', loginRes);

    if (loginRes.ok && loginRes.data.token) {
        token = loginRes.data.token;
        console.log(`🔑 Token retrieved successfully. Using it for subsequent requests.\n`);
    } else {
        console.log(`⚠️ Token not retrieved. Protected routes will likely fail. Is the test user correct?\n`);
    }

    // 3. Test Protected Profile Route
    const profilRes = await makeRequest('/profil');
    printTestResult('GET /api/profil - Protected Profile Check', profilRes);

    // 4. Test Notes Retrieval
    // Assuming module ID 1 and group ID 1 for testing
    const notesRes = await makeRequest('/notes?id_module=1&id_groupe=1');
    printTestResult('GET /api/notes - Get Notes (Module 1, Groupe 1)', notesRes);

    // 5. Test Notes Upsert
    const upsertPayload = {
        id_etudiant: 1,
        id_module: 1,
        type_evaluation: "CC",
        valeur: 15.5
    };
    const upsertRes = await makeRequest('/notes/upsert', 'POST', upsertPayload);
    printTestResult('POST /api/notes/upsert - Add/Update Note', upsertRes);

    // 6. Test Absences (Appel List)
    // Assuming module 1, group 1, and today's date
    const today = new Date().toISOString().split('T')[0];
    const appelRes = await makeRequest(`/absences/appel/1/1/${today}`);
    printTestResult('GET /api/absences/appel - Get Attendance List', appelRes);

    // 7. Test Absences Enregistrer
    const absencePayload = {
        id_etudiant: 1,
        id_affectation: 1,
        date_seance: today,
        statut: "Absent"
    };
    const absSaveRes = await makeRequest('/absences/enregistrer', 'POST', absencePayload);
    printTestResult('POST /api/absences/enregistrer - Register Absence', absSaveRes);

    // 8. Test Supports Retrieval
    // Assuming affectation ID 1
    const supportsRes = await makeRequest('/supports/1');
    printTestResult('GET /api/supports - Get Supports (Affectation 1)', supportsRes);

    console.log("==================================================");
    console.log("🏁 API TESTS COMPLETED");
    console.log("==================================================");
}

runTests();
