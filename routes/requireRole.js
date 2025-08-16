const jwt = require('jsonwebtoken');
const fs = require('fs');
const mysql = require('mysql2/promise');  // dùng promise để dễ async/await

const publicKey = fs.readFileSync('./key_jwt/public.key', 'utf8');

// Tạo pool kết nối MySQL
const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'dangnosuy',
    password: 'dangnosuy', // 🔐 thay bằng mật khẩu thật
    database: 'buonlanghieuluat',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

function requireRole(...allowedRoles) {
    return async (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }

        const token = authHeader.split(' ')[1];

        try {
            // 1. Giải mã token
            const payload = jwt.verify(token, publicKey, { algorithms: ['ES256'] });

            const { role, jti, sub: email } = payload;

            // 2. Kiểm tra quyền
            if (!allowedRoles.includes(role)) {
                return res.status(403).json({ error: 'Permission denied' });
            }

            // 3. Kiểm tra jti trong WHITELIST
            const [rows] = await dbPool.query(
                "SELECT * FROM WHITELIST WHERE jti = ? AND email = ?",
                [jti, email]
            );

            if (rows.length === 0) {
                return res.status(401).json({ error: 'Access token hết hạn vui lòng đăng nhập lại!' });
            }

            // 4. Gắn payload lên req để sử dụng sau
            req.userPayload = payload;

            next(); // Cho đi tiếp

        } catch (err) {
            console.error('JWT verify error:', err);
            return res.status(401).json({ error: 'Invalid or expired token', online: false });
        }
    };
}

module.exports = requireRole;
