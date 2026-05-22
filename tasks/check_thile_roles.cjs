const { pool } = require('./server/db.js');
pool.query(`SELECT u.id, u.email, u.name, ur.role_id, r.name as role_name, r.permissions 
            FROM users u 
            JOIN user_roles ur ON u.id = ur.user_id 
            JOIN roles r ON ur.role_id = r.id 
            WHERE u.email = 'info@thile.ai'`)
    .then(r => console.log(JSON.stringify(r.rows, null, 2)))
    .catch(console.error)
    .finally(() => pool.end());
