const express = require('express')
const axios = require('axios');
const router = express.Router()
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const requireRole = require('./requireRole');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const { google } = require('googleapis');
const { resourceUsage } = require('process');
const { url } = require('inspector');
const { info } = require('console');

const db = mysql.createPool({
    host: 'localhost',
    user: 'dangnosuy',
    password: 'dangnosuy',
    database: 'buonlanghieuluat'
})

router.post('/get-question', requireRole('user', 'admin'), async (req, res) => {
    const { token } = req.body
    console.log("Get question token: ", token)
    const requiredFields = { token };
    // Kiểm tra xem có trường nào bị null/undefined hoặc rỗng không
    const missingField = Object.entries(requiredFields).find(([key, value]) => !value);

    if (missingField) {
        return res.status(400).json({ success: false, message: "Missing some information!" });
    }

    try {
        const [list_question] = await db.query(
            `SELECT question, ans_1, ans_2, ans_3, ans_4, right_ans FROM QUESTION
            WHERE id_lesson = (SELECT id FROM LESSON WHERE token = ?)
            `, [token])
        if (list_question.length <= 0) {
            res.status(200).json({
                success: false,
                message: "Don't have any question for this token!"
            })
        }
        console.log('LIST QUESTION: ', list_question)
        res.status(200).json({
            success : true,
            message: "Succesfully in get question!",
            questions: list_question,
            token : token
        })
    }
    catch (error) {
        console.error("Error in insert lesson: ", error)
        res.status(500).json({
            success : false,
            message : "Some error in this execute!"
        })
    }
})

router.post('/submit-answer', requireRole('user', 'admin'), async (req, res) => {
    const { token, user_ans } = req.body

    const requiredFields = { token, user_ans };
    // Kiểm tra xem có trường nào bị null/undefined hoặc rỗng không
    const missingField = Object.entries(requiredFields).find(([key, value]) => !value);
    if (missingField) {
        return res.status(400).json({ success: false, message: "Missing some information!" });
    }

    console.log(token);    // 'abc123'
    console.log(user_ans); // [ 'A', 'C', 'B', 'D', 'A' ]

    if (!Array.isArray(user_ans)) {
        return res.status(400).json({ error: 'user_ans must be an array!' });
    }
    try {
        const [list_answer] = await db.query(
            `SELECT right_ans FROM QUESTION
            WHERE id_lesson = (SELECT id FROM LESSON WHERE token = ?)
            `, [token])
        if (list_answer.length <= 0) {
            res.status(200).json({
                success: false,
                message: "Don't have any answer for this token!"
            })
        }
        console.log(list_answer)
        let RightAnswers = []
        for (let i = 0; i < list_answer.length; i++) {
            RightAnswers.push(list_answer[i].right_ans)
        }
        console.log("Right Ans From Database: ", RightAnswers)
        let point = 0;
        let rightAns = [];
        for (let i = 0; i < RightAnswers.length; i++) {
            if (user_ans[i] == RightAnswers[i]) {
                rightAns[i] = 1;
                point += 20;
            }
            else {
                rightAns = 0;
            }
        }
        console.log('Right Answer: ', rightAns)
        console.log('Point: ', point)
        res.status(200).json({
            success: true,
            message: "Submit answer successfully!",
            right_answer: RightAnswers,
            user_ans: user_ans,
            point : point
        })
    }
    catch (error) {
        console.error("Error in insert submit answer: ", error)
        res.status(500).json({
            success : false,
            message : "Some error in this execute!"
        })
    }
})

router.get('/get-lesson-video', requireRole('admin'), async(req, res) => {
    try {
        const [result] = await db.query(`
            SELECT l.name, l.topic, l.token, v.url_video
            FROM LESSON l
            LEFT JOIN VIDEO v ON l.id = v.id_lesson
            `);
        console.log('Get lesson vide: ', result)

        res.status(200).json({
            success: true,
            message: "Get lesson and video success!",
            lesson: result
        })
    }
    catch (error) {
        console.error("Error in get lesson video: ", error)
        res.status(500).json({
            success : false,
            message : "Some error in this execute!"
        })
    }
})

// lay cac thong tin video nhu la ten video nguoi tao... (co the up len fb de luu tru khong cong khai roi nhung vao web)
router.get('/get/title-video', async (req, res) => {

})

router.post('/upload-question', requireRole('admin'), async (req, res) => {
    const { token, question, ans_1, ans_2, ans_3, ans_4, right_ans } = req.body

    const requiredFields = { token, question, ans_1, ans_2, ans_3, ans_4, right_ans };
    // Kiểm tra xem có trường nào bị null/undefined hoặc rỗng không
    const missingField = Object.entries(requiredFields).find(([key, value]) => !value);

    if (missingField) {
        return res.status(400).json({ error: `Thiếu trường: ${missingField[0]}` });
    }

    try {
        const [which_lesson] = await db.query('SELECT id FROM LESSON WHERE token = ?', [token])
        console.log(which_lesson)
        if (which_lesson.length <= 0) {
            res.status(400).json({
                success : false,
                message : "There is not another lesson for this token!"
            })
        }

        const id_lesson = which_lesson[0].id
        const [result] = await db.query('INSERT INTO QUESTION (id_lesson, question, ans_1, ans_2, ans_3, ans_4, right_ans) VALUES (?, ?, ?, ?, ?, ?, ?)', [id_lesson, question, ans_1, ans_2, ans_3, ans_4, right_ans])
        console.log("Insert succesfull? (1 is true) -> ", result.affectedRows)
        res.status(200).json({
            success : true,
            message : "Add question successfully!"
        })
    }
    catch (error) {
        console.error("Error in insert question: ", error)
        res.status(500).json({
            success : false,
            message : "Some error in this execute!"
        })
    }
})

router.post('/lesson-full', upload.single('video'), requireRole('admin'), async (req, res) => {
    const { token, name, topic } = req.body;
    let lessonId;
    let generatedToken = token;

    try {
        // Nếu chưa có token thì tạo bài học mới
        if (!token) {
            if (!name || !topic) {
                return res.status(400).json({ success: false, message: "Thiếu name hoặc topic để tạo bài học!" });
            }
            // Kiểm tra name hoặc topic đã tồn tại chưa
            const [exist] = await db.query('SELECT id FROM LESSON WHERE name = ? OR topic = ?', [name, topic]);
            if (exist.length > 0) {
                return res.status(400).json({ success: false, message: "Name hoặc topic đã tồn tại!" });
            }
            generatedToken = uuidv4();
            const [insertLesson] = await db.query(
                'INSERT INTO LESSON (name, topic, token) VALUES (?, ?, ?)',
                [name, topic, generatedToken]
            );
            lessonId = insertLesson.insertId;
        } else {
            // Lấy lessonId từ token
            const [lesson] = await db.query('SELECT id FROM LESSON WHERE token = ?', [token]);
            if (lesson.length === 0) {
                return res.status(400).json({ success: false, message: "Không tìm thấy bài học với token này!" });
            }
            lessonId = lesson[0].id;
        }

        // Nếu có video upload
        if (req.file) {
            const info_file = req.file;
            let url_video = 'http://localhost:5001/' + info_file.path;

            // Kiểm tra đã có video chưa
            const [videoExist] = await db.query('SELECT 1 FROM VIDEO WHERE id_lesson = ?', [lessonId]);
            if (videoExist.length > 0) {
                return res.status(400).json({ success: false, message: "Bài học này đã có video!" });
            }

            await db.query('INSERT INTO VIDEO (id_lesson, url_video) VALUES (?, ?)', [lessonId, url_video]);
        }
        console.log("Success upload video and lesson!")
        return res.status(200).json({
            success: true,
            message: "Thao tác thành công!",
            token: generatedToken,
            url_video: url_video
        });

    } catch (error) {
        console.error("Error in /lesson-full: ", error);
        return res.status(500).json({ success: false, message: "Có lỗi xảy ra!" });
    }
});


module.exports = router;


