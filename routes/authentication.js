const express = require('express')
const bcrypt = require('bcrypt')
const crypto = require('crypto');
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer');
const fs = require('fs');
const router = express.Router();
const mysql = require('mysql2/promise');
const requireRole = require('./requireRole');
const { v4: uuidv4 } = require('uuid');
const { diff } = require('util');

const db = mysql.createPool({
    host: 'localhost',
    user: 'dangnosuy',
    password: 'dangnosuy',
    database: 'buonlanghieuluat'
})

const transporter_email = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Thay bằng SMTP server của bạn
  port: 587,
  secure: false, // true cho port 465, false cho 587
  auth: {
    user: '23520226@gm.uit.edu.vn', // Email của bạn
    pass: 'itla jdog bwze uhbi' // Mật khẩu ứng dụng (không phải mật khẩu Gmail thông thường)
  }
});

async function SendOTPToEmail (email, otp) {
    const mailOTP = {
        from: '23520226@gm.uit.edu.vn',
        to: email,
        subject: "MÃ XÁC MINH TÀI KHOẢN CỦA BẠN",
        text: 'Mã OTP xác minh tài khoản: ' + otp
    }
    try {
        await transporter_email.sendMail(mailOTP)
        console.log("send mail: OK")
        return true
    }
    catch (error) {
        console.error("error: ", error)
        return false
    }
}

async function SendResetPasswordLink(email, token) {
    const mailResetPass = {
        from: '23520226@gm.uit.edu.vn',
        to: email,
        subject: "Đổi mật khẩu cho email: " + email,
        text: 'Link đặt lại mật khẩu cho bạn ' + 'http://localhost:5555/auth/reset-password.html?token=' + token + '\nBạn không được gửi link này cho bất kỳ ai!',
    }
    try {
        await db.query('INSERT INTO RESETPASSWORD(email, token) VALUES (?, ?)', [email, token])
        await transporter_email.sendMail(mailResetPass)
        console.log("send mail: OK, insert ok")
        return true
    }
    catch (error) {
        console.error("error: ", error)
        return false
    }
}

async function SaveOTPToDB(fullname, birthday, education_level, location, email, hashed_password, token, otp, role) {
    console.log("Token: ", token);
    const [check_exist] = await db.query('SELECT * FROM OTP WHERE email = ?', [email]);

    if (check_exist.length > 0) {
        await db.query(
            `UPDATE OTP 
             SET fullname=?, birthday=?, education_level=?, location=?, hashed_password=?, token=?, otp=?,
             WHERE email=?`,
            [fullname, birthday, education_level, location, hashed_password, token, otp, 'user', email]
        );
    } else {
        console.log("Data: ", fullname, birthday, education_level, location, email, hashed_password, token, otp);
        await db.query(
            `INSERT INTO OTP (fullname, birthday, education_level, location, email, hashed_password, token, otp, role) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [fullname, birthday, education_level, location, email, hashed_password, token, otp, 'user']
        );
    }
    console.log("Save OTP: OK");
}


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


router.post('/register', async (req, res) => {
    const { fullname, birthday, education_level, location, email, password } = req.body;

    // Kiểm tra đủ thông tin
    if (!fullname || !birthday || !education_level || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Không đủ thông tin đăng ký, vui lòng kiểm tra thông tin"
        });
    }

    // Kiểm tra độ mạnh mật khẩu
    if (!isStrongPassword(password)) {
        return res.status(400).json({
            success: false,
            message: 'Mật khẩu của bạn yếu, hãy thử mật khẩu khác có sự kết hợp của chữ hoa, chữ thường, số và ký tự đặc biệt'
        });
    }

    try {
        // Check email tồn tại trong USERS
        const [rows] = await db.query('SELECT * FROM USERS WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Đã tồn tại người dùng sử dụng email này. Hãy thử một email khác!'
            });
        }

        // Hash password
        const hashed_password = await bcrypt.hash(password, 10);

        // OTP + token
        const otp_number = Math.floor(Math.random() * 99999) + 10000;
        const verify_token = crypto.randomBytes(32).toString('hex');

        // Lưu vào bảng OTP
        await SaveOTPToDB(fullname, birthday, education_level, location, email, hashed_password, verify_token, otp_number);

        // Gửi OTP
        const success = await SendOTPToEmail(email, otp_number);
        if (success) {
            return res.status(200).json({
                success: true,
                message: 'Mã OTP đã được gửi về email của bạn, hãy kiểm tra!',
                token: verify_token
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi gửi OTP, hãy kiểm tra lại email của bạn'
            });
        }
    } catch (error) {
        console.error("error: ", error);
        return res.status(500).json({
            message: 'Internal Server Error'
        });
    }
});


router.post('/verify-otp', async (req, res) => {
    const { token, otp } = req.body;
    let [user_register] = [];

    try {
        [user_register] = await db.query('SELECT * FROM OTP WHERE token = ? AND otp = ?', [token, otp]);
        console.log(user_register);

        if (user_register.length <= 0) {
            return res.status(400).json({
                success: false,
                message: "Không tồn tại mã OTP! Vui lòng đăng ký lại!"
            });
        }

        const updateAt = user_register[0].updated_at;
        const now = new Date();
        const diffSeconds = (now - updateAt) / 1000;

        if (diffSeconds <= 300) {
            console.log('Token ', token, ' in time');

            // Insert sang USERS với đầy đủ thông tin
            await db.query(
                `INSERT INTO USERS (fullname, birthday, education_level, location, hashed_password, email) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    user_register[0].fullname,
                    user_register[0].birthday,
                    user_register[0].education_level,
                    user_register[0].location,
                    user_register[0].hashed_password,
                    user_register[0].email,
                ]
            );

            // Xoá bản ghi OTP
            await db.query('DELETE FROM OTP WHERE token = ?', [token]);

            res.status(200).json({
                success: true,
                message: 'Đăng ký thành công! Vui lòng đăng nhập!'
            });
        } else {
            console.log('Token ', token, 'has expired');
            await db.query('DELETE FROM OTP WHERE token = ?', [token]);
            res.status(400).json({
                success: false,
                message: 'Mã OTP hết hạn'
            });
        }
    } catch (error) {
        console.error("Error: ", error);
        res.status(403).json({
            message: 'Có vấn đề với mã OTP, hãy thử lại hoặc liên hệ bộ phận hỗ trợ'
        });
    }
});


const privateKey = fs.readFileSync('key_jwt/private.key')

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Lấy user từ DB theo email
        const [users] = await db.query('SELECT * FROM USERS WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(400).json({
                success : false,
                message: 'Email hoặc mật khẩu không đúng! Vui lòng thử lại!'
            });
        }

        const user = users[0];
        
        const isMatch = await bcrypt.compare(password, user.hashed_password);

        if (!isMatch) {
            return res.status(400).json({
                success : false,
                message: 'Email hoặc mật khẩu không đúng! Vui lòng thử lại!'
            });
        }
        const role = user.role 
        const jti = uuidv4();

        const [result] = await db.query('INSERT INTO WHITELIST (jti, email) VALUES (?, ?) ON DUPLICATE KEY UPDATE jti= ?', [jti, email, jti])
        console.log("So hang thay doi:", result.affectedRows)
        // Tạo JWT nếu password đúng
        const payload = {
            sub: email,
            role: role,
            jti : jti,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60),
        };
        const jwt_token = jwt.sign(payload, privateKey, { algorithm: 'ES256' });
        console.log(jwt_token)
        res.status(200).json({
            message: 'Đăng nhập thành công!',
            success : true,
            token: jwt_token
        });
    }
    catch (error) {
        console.error("Error: ", error);
        res.status(500).json({
            success : false,
            message: 'Internal Server Error'
        });
    }
});

router.post('/logout', requireRole('user', 'admin'), async (req, res) => {
    const jti = req.userPayload.jti
    const email = req.userPayload.sub

    console.log(jti, email)
    try {
        const [result] = await db.query('UPDATE WHITELIST SET jti=NULL WHERE email=?', [email])
        console.log("Dang xuat:", result.affectedRows) 

        res.status(200).json({
            success : true,
            message: "Đăng xuất thành công!"
        })
    }
    catch (error) {
        console.error("Error: ", error);
        res.status(400).json({
            success : false,
            message: 'Có lỗi xảy ra, vui lòng thử lại sau!'
        });
    }
})
router.get('/check-online', requireRole('user', 'admin'), async (req, res) => {
    const jti = req.userPayload.jti
    const email = req.userPayload.sub
    console.log('CHECK-ONLINE')
    try {
        const [result] = await db.query('SELECT 1 FROM WHITELIST WHERE jti = ? AND email = ?', [jti, email])
        if (result.length <= 0) {
            res.status(200).json({
                success: true,
                online: false,
                message: "Tài khoản đã được đăng xuất, vui lòng đăng nhập lại!"
            })
        }
        res.status(200).json({
            success: true,
            online: true,
            message: "Tài khoản đang đăng nhập!"
        })
    }
    catch (error) {
        console.error("Error: ", error);
        res.status(400).json({
            success : false,
            message: 'Có lỗi xảy ra, vui lòng thử  lại sau!'
        });
    }
})

router.post('/forget-password', async (req, res) => {
    const { email } = req.body
    try {
        const [check_user] = await db.query('SELECT id FROM USERS WHERE email = ?', [email])
        if (check_user.length <= 0) {
            return res.status(400).json({
                success : false,
                message: "Không tồn tại tài khoản với email này!"
            })
        }
        else {
            const verify_token = crypto.randomBytes(32).toString('hex');
            await SendResetPasswordLink(email, verify_token)
            res.status(200).json({
                success : true,
                message: "Link cập nhật mật khẩu đã được gửi đến email của bạn! Vui lòng kiểm tra hộp thư email!"
            })
        }
    }
    catch (error) {
        console.error("Error: ", error)
        res.status(500).json({
            success : false,
            message: "Internal Server Error"
        })
    }
})
router.post('/reset-password', async (req, res) => {
    const { new_password, token } = req.body
    console.log(new_password, token)
    if (!isStrongPassword(new_password)) {
        return res.status(400).json({
            success : false,
            message: 'Mật khẩu yếu, vui lòng đặt lại mật khẩu khác (ký tự thường, hoa, chữ số, ký tự đặc biệt)!'
        });
    }
    hashed_password = await bcrypt.hash(new_password, 10)
    console.log(new_password, hashed_password)
    try {
        const [user] = await db.query('SELECT * FROM RESETPASSWORD WHERE token=?', [token])
        console.log(user)
        if (user.length <= 0) {
            res.status(400).json({
                success : false,
                message: "Hết hạn đổi mật khẩu, vui lòng thử lại!"
            })
        }
        else {
            const updateAt = user[0].updated_at 
            console.log("Updated at: ", updateAt)
            const now = new Date()
            const diffMs = now - updateAt
            const diffSeconds = diffMs / 1000
            console.log('Token ', token, ' ', diffSeconds)

            if (diffSeconds <= 300) {
                console.log('Token ', token, ' in time')
                const [result] = await db.query('UPDATE USERS SET hashed_password=? WHERE email=?', [hashed_password, user[0].email])
                console.log("Số dòng được cập nhật:", result.affectedRows)
                await db.query('DELETE FROM RESETPASSWORD WHERE token=?', [token])
                res.status(200).json({
                    success : true,
                    message: "Thay đổi mật khẩu thành công!"
                })
            }    
            else {
                console.log('Token ', token, 'has over expired')
                await db.query('DELETE FROM RESETPASSWORD WHERE token = ?', [token])
                res.status(400).json({
                    success : false,
                    message: 'Hết hạn đổi mật khẩu, vui lòng thử lại!'
                })
            } 
        }
    }
    catch (error) {
        console.error("Error: ", error)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
})


module.exports = router;