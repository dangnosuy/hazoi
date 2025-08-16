const oauth2Client = new google.auth.OAuth2(
  '',
  '',
  ''
);

// 2. Gán refresh token để không cần đăng nhập lại
oauth2Client.setCredentials({
  refresh_token: ''
});

// 3. Tạo YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client
});

// 4. Hàm upload video
async function uploadVideo(filePath, title, description, tags) {
    let url = null;
    try {
        console.log('Bat dau upload video')
        const res = await youtube.videos.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: title,
                    description: description,
                    tags: tags,
                    categoryId: '22' // People & Blogs
                },
                status: {
                    privacyStatus: 'unlisted' // Không công khai
                }   
            },
            media: {
                body: fs.createReadStream(filePath)
            } 
        });
        console.log('✅ Video uploaded successfully!');
        console.log('Video ID:', res.data.id);
        url = `https://www.youtube.com/embed/${res.data.id}`
        console.log('Embed URL:', url);
    } catch (err) {
        console.error('❌ Upload failed:', err);
        url = null
    }
    console.log('Ket thuc upload video')
    return url;
}

router.post('/upload-video', upload.single('video'), async (req, res) => {
    const { title, description, tags, token } = req.body 
    console.log(title, description, tags, token)
    const requiredFields = { title, description, tags, token };
    const missingField = Object.entries(requiredFields).find(([key, value]) => !value);

    if (missingField) {
        return res.status(400).json({ success: false, message: `Thiếu trường: ${missingField[0]}` });
    }
    let parsedTags;
    try {
        parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
        if (!Array.isArray(parsedTags)) {
            throw new Error("Tags is not a valid array format.");
        }
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Tags must be a valid JSON array string (e.g., \'["tag1","tag2"]\').'
        });
    }
    const info_file = req.file;
    console.log(info_file);

    try {
        const [lesson] = await db.query('SELECT id FROM LESSON WHERE token = ?', [token]);
        // khong co ton tai token cua bai hoc nay!
        if (lesson.length <= 0) {
            console.log('Khong ton tai token')
            res.status(401).json({
                success: false,
                message: "Don't have any token in data! Try again!"
            })
        }
        const [video] = await db.query('SELECT 1 FROM VIDEO WHERE id_lesson = ?', [lesson[0].id])
        if (video.length > 0) {
            console.log('Da ton tai video trong lesson nay')
            res.status(401).json({
                success: false,
                message: "This token have already contains video!"
            })
        }
        //const url_video = await uploadVideo(info_file.path, title, description, tags);
        const url_video = 'http://localhost:5001/' + info_file.path
        console.log(url_video)
        
        if (url_video == null) {
            console.log('Co loi luc tao video!')
            res.status(500).json({
                success: false,
                message: "They have some error in this feature!"
            })
        }
        const [result] = await db.query('INSERT INTO VIDEO (id_lesson, url_video) VALUES (?, ?)', [lesson[0].id, url_video])
        console.log("Upload video thanh cong? (1 is true) -> ". result.affectedRows)
        res.status(200).json({
            success: true,
            message: "Upload video for succesfully!",
            url: url_video
        })
    }
    catch (error) {
        console.error("Error in upload video on youtube: ", error)
        res.status(500).json({
            success : false,
            message : "Some error in this execute!"
        })
    }
})

router.post('/insert-lesson', requireRole('admin'), async (req, res) => {
    const { name, topic } = req.body
    try {
        const [result] = await db.query('SELECT id FROM LESSON WHERE name = ? OR topic = ?', [name, topic])
        if (result.length > 0) { // da ton tai name va topic nay roi => Khong cho insert
            res.status(400).json({
                success : false,
                message: "This name or topic is exist on database! Try another!"
            })
        }
        const token = uuidv4();
        const [add] = await db.query('INSERT INTO LESSON(name, topic, token) VALUES (?, ?, ?)', [name, topic, token])

        console.log("Did you insert? (1 is true) -> ", add.affectedRows)
        res.status(200).json({
            success : true,
            message : "Add new lesson is successfully!",
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