const axios = require('axios');
async function test() {
    try {
        const login = await axios.post('http://localhost:5000/api/auth/login', { username: 'test_prof', password: 'password123' });
        const token = login.data.token;
        const res = await axios.get('http://localhost:5000/api/absences/appel/62/37/2026-05-30?type_seance=TD', { headers: { Authorization: `Bearer ${token}` } });
        console.log(res.data.length);
    } catch(e) {
        console.log(e.response ? e.response.data : e.message);
    }
}
test();
