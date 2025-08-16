const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const requireRole = require('./requireRole');
const bcrypt = require('bcrypt')

const db = mysql.createPool({
    host: 'localhost',
    user: 'dangnosuy',
    password: 'dangnosuy',
    database: 'buonlanghieuluat'
});


// get user info, email, name, location, education level, certificate(if they have)
router.get('/get-info', requireRole('admin', 'user'), async (req, res) => {
    const email = req.userPayload.sub
    try {
        const [base_info] = await db.query('SELECT email, fullname, birthday, education_level, location, created_at FROM USERS where email=?', [email])
        console.log('Data of email: ', email, ': ', base_info)

        const [learningProgress] = await db.query(`
            SELECT l.name AS lesson_name, l.topic, ul.score
            FROM USER_LEARNING ul
            JOIN LESSON l ON ul.id_lesson = l.id
            WHERE ul.email = ?
            `, [email]);

        if (base_info.length <= 0) {
            res.status(200).json({
                success: false,
                message: "Không có bất kỳ thông tin với tài khoản này!"
            })
        }
        res.status(200).json({
            success: true,
            message: "Get data successfully!",
            information: base_info,
            learning: learningProgress
        })
    }
    catch (error) {
        console.error('Error in get info of user:', error)
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy thông tin người dùng'
        })
    }
})

function isStrongPassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber    = /[0-9]/.test(password);
    const hasSpecial   = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength 
        && hasUpperCase 
        && hasLowerCase 
        && (hasNumber 
        || hasSpecial);
}

router.put('/update-password', requireRole('admin', 'user'), async (req, res) => {
    const { new_password } = req.body
    const email = req.userPayload.sub
    if (!isStrongPassword(new_password)) {
        res.status(400).json({
            success: false,
            message: "Mật khẩu yếu, thử một mật khẩu khác!"
        })
    }
    const hashed_password = await bcrypt.hash(new_password, 10);
    try {
        const [result] = await db.query('UPDATE USERS SET hashed_password = ? WHERE email = ?', [hashed_password, email])
        console.log('So hang thay doi: ', result.affectedRows)

        res.status(200).json({
            success: true,
            message: "Cập nhật mật khẩu thành công!"
        })
    }
    catch (error) {
        console.error('Error in update password:', error)
        res.status(500).json({
            success: false,
            message: 'Có lỗi khi cập nhật mật khẩu người dùng!'
        })
    }
})

router.delete('/delelte-account', requireRole('admin', 'user'), async(req, res) => {
    const email = req.userPayload.sub

    try {
        const [del_user] = await db.query('DELETE FROM USERS WHERE email = ?', [email])
        console.log('Xoa USERS: ', del_user.affectedRows)
        const [del_history_chat] = await db.query('DELETE FROM HISTORY WHERE email = ?', [email])
        const [del_learning] = await db.query('DELETE FROM USER_LEARNING WHERE email = ?', [email])
        const [del_whitelist] = await db.query('DELETE FROM WHITELIST WHERE email = ?', [email])
        res.status(200).json({
            success: true,
            message: "Xóa tài khoản người dùng thành công!"
        })
    }
    catch (error) {
        console.error('Error in update password:', error)
        res.status(500).json({
            success: false,
            message: 'Có lỗi khi xóa tài khoản người dùng!'
        })
    }
})

module.exports = router;