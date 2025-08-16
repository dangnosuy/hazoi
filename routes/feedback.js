const express = require('express')
const router = express.Router()
const mysql = require('mysql2/promise')
const { v4: uuidv4 } = require('uuid')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const requireRole = require('./requireRole')

const db = mysql.createPool({
    host: 'localhost',
    user: 'dangnosuy',
    password: 'dangnosuy',
    database: 'buonlanghieuluat'
})

// Tạo thư mục uploads nếu chưa có
const uploadsDir = path.join(__dirname, '../uploads/feedback')
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}

// Cấu hình multer để upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
})

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/mov']
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Chỉ hỗ trợ file JPG, PNG, MP4, MOV'))
        }
    }
})

// Tạo mã tra cứu duy nhất
function generateTrackingCode() {
    const prefix = 'FB'
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}${timestamp}${random}`
}

// API gửi feedback (không cần đăng nhập)
router.post('/submit', upload.array('attachments', 5), async (req, res) => {
    try {
        const { fullName, location, contact, content, feedbackTypes, anonymous } = req.body
        
        // Validate dữ liệu bắt buộc
        if (!location || !content) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
            })
        }

        // Parse feedbackTypes từ JSON string
        let parsedFeedbackTypes
        try {
            parsedFeedbackTypes = JSON.parse(feedbackTypes || '[]')
        } catch (error) {
            parsedFeedbackTypes = []
        }

        if (parsedFeedbackTypes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn ít nhất một loại nội dung'
            })
        }

        // Tạo mã tra cứu
        let trackingCode
        let isUnique = false
        while (!isUnique) {
            trackingCode = generateTrackingCode()
            const [existing] = await db.query('SELECT id FROM FEEDBACK WHERE tracking_code = ?', [trackingCode])
            if (existing.length === 0) {
                isUnique = true
            }
        }

        // Lưu feedback vào database
        const [result] = await db.query(`
            INSERT INTO FEEDBACK (tracking_code, full_name, location, contact, content, feedback_types, anonymous) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            trackingCode,
            anonymous === 'true' ? null : fullName,
            location,
            contact,
            content,
            JSON.stringify(parsedFeedbackTypes),
            anonymous === 'true'
        ])

        const feedbackId = result.insertId

        // Lưu file đính kèm nếu có
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await db.query(`
                    INSERT INTO FEEDBACK_ATTACHMENTS (feedback_id, file_name, file_path, file_type, file_size)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    feedbackId,
                    file.originalname,
                    file.path,
                    file.mimetype,
                    file.size
                ])
            }
        }

        res.status(200).json({
            success: true,
            message: 'Gửi góp ý thành công',
            trackingCode: trackingCode
        })

    } catch (error) {
        console.error('Error submitting feedback:', error)
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi gửi góp ý'
        })
    }
})

// API tra cứu feedback theo mã tra cứu (không cần đăng nhập)
router.get('/track/:trackingCode', async (req, res) => {
    try {
        const { trackingCode } = req.params

        if (!trackingCode) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập mã tra cứu'
            })
        }

        const [feedback] = await db.query(`
            SELECT 
                tracking_code,
                full_name,
                location,
                content,
                feedback_types,
                anonymous,
                status,
                admin_response,
                created_at,
                updated_at
            FROM FEEDBACK 
            WHERE tracking_code = ?
        `, [trackingCode])

        if (feedback.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phản ánh với mã tra cứu này'
            })
        }

        const feedbackData = feedback[0]
        
        // Parse feedback_types từ JSON
        try {
            feedbackData.feedback_types = JSON.parse(feedbackData.feedback_types)
        } catch (error) {
            feedbackData.feedback_types = []
        }

        // Lấy file đính kèm
        const [attachments] = await db.query(`
            SELECT file_name, file_type, file_size, created_at
            FROM FEEDBACK_ATTACHMENTS 
            WHERE feedback_id = (SELECT id FROM FEEDBACK WHERE tracking_code = ?)
        `, [trackingCode])

        feedbackData.attachments = attachments

        res.status(200).json({
            success: true,
            feedback: feedbackData
        })

    } catch (error) {
        console.error('Error tracking feedback:', error)
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi tra cứu'
        })
    }
})

// API lấy danh sách feedback (chỉ admin)
router.get('/list', requireRole('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query
        const offset = (page - 1) * limit

        let whereClause = '1=1'
        let queryParams = []

        if (status && status !== 'all') {
            whereClause += ' AND status = ?'
            queryParams.push(status)
        }

        if (search) {
            whereClause += ' AND (tracking_code LIKE ? OR location LIKE ? OR content LIKE ?)'
            const searchTerm = `%${search}%`
            queryParams.push(searchTerm, searchTerm, searchTerm)
        }

        // Đếm tổng số feedback
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total FROM FEEDBACK WHERE ${whereClause}
        `, queryParams)

        const total = countResult[0].total

        // Lấy danh sách feedback
        const [feedbacks] = await db.query(`
            SELECT 
                id,
                tracking_code,
                full_name,
                location,
                content,
                feedback_types,
                anonymous,
                status,
                created_at,
                updated_at
            FROM FEEDBACK 
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), parseInt(offset)])

        // Parse feedback_types cho mỗi feedback
        feedbacks.forEach(feedback => {
            try {
                feedback.feedback_types = JSON.parse(feedback.feedback_types)
            } catch (error) {
                feedback.feedback_types = []
            }
        })

        res.status(200).json({
            success: true,
            feedbacks: feedbacks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / limit)
            }
        })

    } catch (error) {
        console.error('Error getting feedback list:', error)
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy danh sách phản ánh'
        })
    }
})

// API cập nhật trạng thái feedback (chỉ admin)
router.put('/update/:trackingCode', requireRole('admin'), async (req, res) => {
    try {
        const { trackingCode } = req.params
        const { status, adminResponse } = req.body

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn trạng thái'
            })
        }

        const validStatuses = ['pending', 'processing', 'resolved', 'rejected']
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ'
            })
        }

        const [result] = await db.query(`
            UPDATE FEEDBACK 
            SET status = ?, admin_response = ?, updated_at = CURRENT_TIMESTAMP
            WHERE tracking_code = ?
        `, [status, adminResponse || null, trackingCode])

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phản ánh với mã tra cứu này'
            })
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái thành công'
        })

    } catch (error) {
        console.error('Error updating feedback:', error)
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi cập nhật'
        })
    }
})

// API lấy chi tiết feedback (chỉ admin)
router.get('/detail/:trackingCode', requireRole('admin'), async (req, res) => {
    try {
        const { trackingCode } = req.params

        const [feedback] = await db.query(`
            SELECT * FROM FEEDBACK WHERE tracking_code = ?
        `, [trackingCode])

        if (feedback.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phản ánh'
            })
        }

        const feedbackData = feedback[0]
        
        // Parse feedback_types
        try {
            feedbackData.feedback_types = JSON.parse(feedbackData.feedback_types)
        } catch (error) {
            feedbackData.feedback_types = []
        }

        // Lấy file đính kèm
        const [attachments] = await db.query(`
            SELECT * FROM FEEDBACK_ATTACHMENTS WHERE feedback_id = ?
        `, [feedbackData.id])

        feedbackData.attachments = attachments

        res.status(200).json({
            success: true,
            feedback: feedbackData
        })

    } catch (error) {
        console.error('Error getting feedback detail:', error)
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy chi tiết phản ánh'
        })
    }
})

module.exports = router