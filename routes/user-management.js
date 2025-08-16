const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const requireRole = require('./requireRole');

const db = mysql.createPool({
    host: 'localhost',
    user: 'dangnosuy',
    password: 'dangnosuy',
    database: 'buonlanghieuluat'
});

// =================================================================================
// GET USERS LIST WITH PAGINATION AND FILTERS
// =================================================================================
router.get('/users', requireRole('admin'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            role = 'all',
            education_level = 'all',
            location = 'all',
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        
        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];

        // Search filter (tìm theo tên hoặc email)
        if (search.trim()) {
            whereConditions.push('(fullname LIKE ? OR email LIKE ?)');
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        // Role filter
        if (role !== 'all') {
            whereConditions.push('role = ?');
            queryParams.push(role);
        }

        // Education level filter
        if (education_level !== 'all') {
            whereConditions.push('education_level = ?');
            queryParams.push(education_level);
        }

        // Location filter
        if (location !== 'all') {
            whereConditions.push('location LIKE ?');
            queryParams.push(`%${location}%`);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Validate sort fields
        const validSortFields = ['fullname', 'email', 'role', 'education_level', 'location', 'created_at'];
        const validSortOrders = ['ASC', 'DESC'];
        
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortOrder = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM USERS ${whereClause}`;
        const [countResult] = await db.query(countQuery, queryParams);
        const total = countResult[0].total;

        // Get users data
        const usersQuery = `
            SELECT 
                id,
                fullname,
                email,
                birthday,
                education_level,
                location,
                role,
                signin_google,
                created_at,
                updated_at,
                TIMESTAMPDIFF(YEAR, birthday, CURDATE()) as age
            FROM USERS 
            ${whereClause}
            ORDER BY ${sortField} ${sortOrder}
            LIMIT ? OFFSET ?
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        const [users] = await db.query(usersQuery, queryParams);

        // Calculate pagination info
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        res.status(200).json({
            success: true,
            message: "Lấy danh sách người dùng thành công!",
            users: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: totalPages,
                hasNext: hasNext,
                hasPrev: hasPrev
            }
        });

    } catch (error) {
        console.error("Error in get users: ", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi lấy danh sách người dùng!"
        });
    }
});

// =================================================================================
// GET USER STATISTICS
// =================================================================================
router.get('/users/statistics', requireRole('admin'), async (req, res) => {
    try {
        // Total users
        const [totalResult] = await db.query('SELECT COUNT(*) as total FROM USERS');
        const totalUsers = totalResult[0].total;

        // Users by role
        const [roleStats] = await db.query(`
            SELECT role, COUNT(*) as count 
            FROM USERS 
            GROUP BY role
        `);

        // Users by education level
        const [educationStats] = await db.query(`
            SELECT education_level, COUNT(*) as count 
            FROM USERS 
            GROUP BY education_level 
            ORDER BY count DESC
        `);

        // Users by location (top 10)
        const [locationStats] = await db.query(`
            SELECT location, COUNT(*) as count 
            FROM USERS 
            WHERE location IS NOT NULL AND location != ''
            GROUP BY location 
            ORDER BY count DESC 
            LIMIT 10
        `);

        // New users this month
        const [monthlyStats] = await db.query(`
            SELECT COUNT(*) as count 
            FROM USERS 
            WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
            AND YEAR(created_at) = YEAR(CURRENT_DATE())
        `);

        // Users with Google sign-in
        const [googleStats] = await db.query(`
            SELECT 
                SUM(signin_google = 1) as google_users,
                SUM(signin_google = 0) as regular_users
            FROM USERS
        `);

        // Age distribution
        const [ageStats] = await db.query(`
            SELECT 
                CASE 
                    WHEN TIMESTAMPDIFF(YEAR, birthday, CURDATE()) < 18 THEN 'Dưới 18'
                    WHEN TIMESTAMPDIFF(YEAR, birthday, CURDATE()) BETWEEN 18 AND 25 THEN '18-25'
                    WHEN TIMESTAMPDIFF(YEAR, birthday, CURDATE()) BETWEEN 26 AND 35 THEN '26-35'
                    WHEN TIMESTAMPDIFF(YEAR, birthday, CURDATE()) BETWEEN 36 AND 50 THEN '36-50'
                    ELSE 'Trên 50'
                END as age_group,
                COUNT(*) as count
            FROM USERS 
            GROUP BY age_group
            ORDER BY count DESC
        `);

        res.status(200).json({
            success: true,
            message: "Lấy thống kê người dùng thành công!",
            statistics: {
                total_users: totalUsers,
                new_users_this_month: monthlyStats[0].count,
                role_distribution: roleStats,
                education_distribution: educationStats,
                location_distribution: locationStats,
                signin_method: {
                    google: googleStats[0].google_users || 0,
                    regular: googleStats[0].regular_users || 0
                },
                age_distribution: ageStats
            }
        });

    } catch (error) {
        console.error("Error in get user statistics: ", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi lấy thống kê người dùng!"
        });
    }
});

// =================================================================================
// GET USER DETAIL
// =================================================================================
router.get('/users/:id', requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;

        // Get user info
        const [userResult] = await db.query(`
            SELECT 
                id,
                fullname,
                email,
                birthday,
                education_level,
                location,
                role,
                signin_google,
                created_at,
                updated_at,
                TIMESTAMPDIFF(YEAR, birthday, CURDATE()) as age
            FROM USERS 
            WHERE id = ?
        `, [userId]);

        if (userResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng!"
            });
        }

        const user = userResult[0];

        // Get user learning progress
        const [learningProgress] = await db.query(`
            SELECT 
                ul.score,
                ul.created_at as completed_at,
                l.name as lesson_name,
                l.topic as lesson_topic
            FROM USER_LEARNING ul
            JOIN LESSON l ON ul.id_lesson = l.id
            WHERE ul.email = ?
            ORDER BY ul.created_at DESC
        `, [user.email]);

        // Get user chat history count
        const [chatHistoryCount] = await db.query(`
            SELECT COUNT(*) as total_chats
            FROM HISTORY 
            WHERE email = ?
        `, [user.email]);

        // Get user feedback count
        const [feedbackCount] = await db.query(`
            SELECT COUNT(*) as total_feedback
            FROM FEEDBACK 
            WHERE contact = ?
        `, [user.email]);

        res.status(200).json({
            success: true,
            message: "Lấy thông tin chi tiết người dùng thành công!",
            user: {
                ...user,
                learning_progress: learningProgress,
                total_chats: chatHistoryCount[0].total_chats,
                total_feedback: feedbackCount[0].total_feedback
            }
        });

    } catch (error) {
        console.error("Error in get user detail: ", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi lấy thông tin người dùng!"
        });
    }
});

// =================================================================================
// UPDATE USER ROLE
// =================================================================================
router.put('/users/:id/role', requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        if (!role || !['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role không hợp lệ! Chỉ chấp nhận 'user' hoặc 'admin'"
            });
        }

        // Check if user exists
        const [userCheck] = await db.query('SELECT id FROM USERS WHERE id = ?', [userId]);
        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng!"
            });
        }

        // Update role
        await db.query('UPDATE USERS SET role = ? WHERE id = ?', [role, userId]);

        res.status(200).json({
            success: true,
            message: `Cập nhật role thành '${role}' thành công!`
        });

    } catch (error) {
        console.error("Error in update user role: ", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi cập nhật role!"
        });
    }
});

// =================================================================================
// GET FILTER OPTIONS
// =================================================================================
router.get('/users/filters/options', requireRole('admin'), async (req, res) => {
    try {
        // Get unique education levels
        const [educationLevels] = await db.query(`
            SELECT DISTINCT education_level 
            FROM USERS 
            WHERE education_level IS NOT NULL AND education_level != ''
            ORDER BY education_level
        `);

        // Get unique locations
        const [locations] = await db.query(`
            SELECT DISTINCT location 
            FROM USERS 
            WHERE location IS NOT NULL AND location != ''
            ORDER BY location
        `);

        res.status(200).json({
            success: true,
            message: "Lấy tùy chọn bộ lọc thành công!",
            filters: {
                education_levels: educationLevels.map(item => item.education_level),
                locations: locations.map(item => item.location),
                roles: ['user', 'admin']
            }
        });

    } catch (error) {
        console.error("Error in get filter options: ", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi lấy tùy chọn bộ lọc!"
        });
    }
});
// =================================================================================
// CREATE NEW USER
// =================================================================================
router.post('/users', requireRole('admin'), async (req, res) => {
    try {
        const {
            fullname,
            email,
            birthday,
            education_level,
            location,
            role,
            password
        } = req.body;

        // Validation
        if (!fullname || !email || !birthday || !education_level || !password) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng điền đầy đủ thông tin bắt buộc!"
            });
        }

        // Check if email already exists
        const [existingUser] = await db.query('SELECT id FROM USERS WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email đã tồn tại trong hệ thống!"
            });
        }

        // Hash password
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await db.query(`
            INSERT INTO USERS (
                fullname, 
                email, 
                birthday, 
                education_level, 
                location, 
                role, 
                hashed_password,
                signin_google
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            fullname,
            email,
            birthday,
            education_level,
            location || null,
            role || 'user',
            hashedPassword,
            false
        ]);

        res.status(201).json({
            success: true,
            message: "Tạo người dùng mới thành công!",
            user_id: result.insertId
        });

    } catch (error) {
        console.error("Error in create user: ", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi tạo người dùng!"
        });
    }
});

// =================================================================================
// DELETE USER
// =================================================================================
router.delete('/users/:id', requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user exists
        const [userCheck] = await db.query('SELECT id, email FROM USERS WHERE id = ?', [userId]);
        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng!"
            });
        }

        const userEmail = userCheck[0].email;

        // Start transaction
        await db.query('START TRANSACTION');

        try {
            // Delete related records first (due to foreign key constraints)
            await db.query('DELETE FROM USER_LEARNING WHERE email = ?', [userEmail]);
            await db.query('DELETE FROM HISTORY WHERE email = ?', [userEmail]);
            await db.query('DELETE FROM WHITELIST WHERE email = ?', [userEmail]);
            
            // Delete the user
            await db.query('DELETE FROM USERS WHERE id = ?', [userId]);

            // Commit transaction
            await db.query('COMMIT');

            res.status(200).json({
                success: true,
                message: "Xóa người dùng thành công!"
            });

        } catch (error) {
            // Rollback transaction on error
            await db.query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error("Error in delete user: ", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa người dùng!"
        });
    }
});

// =================================================================================
// UPDATE USER INFORMATION
// =================================================================================
router.put('/users/:id', requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;
        const {
            fullname,
            birthday,
            education_level,
            location
        } = req.body;

        // Check if user exists
        const [userCheck] = await db.query('SELECT id FROM USERS WHERE id = ?', [userId]);
        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng!"
            });
        }

        // Build update query dynamically
        let updateFields = [];
        let updateValues = [];

        if (fullname) {
            updateFields.push('fullname = ?');
            updateValues.push(fullname);
        }
        if (birthday) {
            updateFields.push('birthday = ?');
            updateValues.push(birthday);
        }
        if (education_level) {
            updateFields.push('education_level = ?');
            updateValues.push(education_level);
        }
        if (location !== undefined) {
            updateFields.push('location = ?');
            updateValues.push(location);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Không có thông tin nào để cập nhật!"
            });
        }

        updateValues.push(userId);

        const updateQuery = `UPDATE USERS SET ${updateFields.join(', ')} WHERE id = ?`;
        await db.query(updateQuery, updateValues);

        res.status(200).json({
            success: true,
            message: "Cập nhật thông tin người dùng thành công!"
        });

    } catch (error) {
        console.error("Error in update user: ", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi cập nhật thông tin người dùng!"
        });
    }
});

module.exports = router;
