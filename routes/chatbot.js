const express = require('express')
const axios = require('axios');
const router = express.Router()
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const requireRole = require('./requireRole');

const db = mysql.createPool({
    host: 'localhost',
    user: 'dangnosuy',
    password: 'dangnosuy',
    database: 'buonlanghieuluat'
})

const constant_prompt = 'Bạn là một trợ lý ảo AI phục vụ cho tôi về các vấn đề về pháp luật Việt Nam cụ thể  hơn là cho dân tộc thiểu số. Hãy cố gắng trả lời hết các câu hỏi bằng tiếng Việt không được có chút tiếng nước ngoài lẫn lộn vào nhé!'

async function CallAI(prompt) {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: "deepseek/deepseek-r1:free", // bạn có thể đổi model tại đây (deepseek/deepseek-r1:free, deepseek/deepseek-r1-0528-qwen3-8b:free)
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            },
            {
                headers: {
                    'Authorization': 'Bearer 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', // thay bằng API key thật
                    'Content-Type': 'application/json',
                }
            }
        );
        //console.log("Reponse: ", response)
        return response;

    } catch (error) {
        console.error("Error calling OpenRouter API:", error.response?.data || error.message);
        return null;
    }
}

router.get('/get/history/:token', requireRole('user') , async (req, res) => {
    const token = req.params.token
    const email = req.userPayload.sub
    try {
        const [history] = await db.query('SELECT question, answer, token FROM HISTORY WHERE token = ? AND email = ?', [token, email])
        
        if (history.length <= 0) {
            res.status(200).json({
                success: true,
                message: "You don't have any history with this token or check your email to get history"
            })
        }
        res.status(200).json ({
            success: true,
            history : history
        })
    }
    catch (error) {
        console.error('Error: ', error);
        res.status(500).json({
            success: false,
            message: 'Error in get history'
        });
    }  
})

router.get('/get/title/history/', requireRole('user', 'admin'), async (req, res) => {
    const email = req.userPayload.sub
    
    try {
        const [result] = await db.query(`
            SELECT h.token, h.question, h.answer, h.updated_at
            FROM HISTORY h
            INNER JOIN (
                SELECT token, MAX(updated_at) AS max_updated
                FROM HISTORY
                WHERE email = ?
                GROUP BY token
            ) latest ON h.token = latest.token AND h.updated_at = latest.max_updated
            WHERE h.email = ?
            ORDER BY h.updated_at DESC
        `, [email, email]);
        console.log("title history: ", result, email)
        res.status(200).json({
            success : true,
            history : result
        })
    }
    catch (error) {
        console.error('Error: ', error);
        res.status(500).json({
            success: false,
            message: 'Error in get history'
        });
    }
})

router.post('/post/question', requireRole('user', 'admin'), async (req, res) => {
    const { question } = req.body;
    const email = req.userPayload.sub
    console.log("Email", email)
    const token = uuidv4();
    console.log("Token (auto-generated): ", token);

    try {
        const prompt = constant_prompt + question;
        const response = await CallAI(prompt);
        const answer = response.data.choices[0].message.content 
        console.log(response.data.choices[0])
        try {
            await db.query('INSERT INTO HISTORY (email, question, answer, token) VALUES (?, ?, ?, ?)', [email, question, answer, token])
            res.status(200).json({
                success: true,
                answer: answer,
                token: token
            });
        }
        catch (error) {
            console.error('Error:', error);
            res.status(500).json({ success: false, message: 'Error in get answer' });
        }
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error in get answer' });
    }
});

router.post('/post/question/:token', requireRole('user') , async (req, res) => {
    const { question } = req.body
    let token = req.params.token
    const email = req.userPayload.sub

    if (!token) {
        token = uuidv4();
    }
    try {
        const prompt = constant_prompt + question
        
        const response = await CallAI(prompt)
        // Trích xuất kết quả giống Python
        const answer = response.data.choices[0].message.content;
        console.log(answer)
        try {
            await db.query('INSERT INTO HISTORY (email, question, answer, token) VALUES (?, ?, ?, ?)', [email, question, answer, token])

            res.status(200).json({
                success: true,
                answer: answer,
                token: token
            })
        } catch (parseError) {
            console.error('Parse error:', parseError);
            res.status(500).json({ success: false, message: 'Failed to get answer' });
        }
    } catch (error) {
        console.error('Error: ', error);
        res.status(500).json({
            success: false,
            message: 'Error in get anser'
        });
    }
})


module.exports = router;
