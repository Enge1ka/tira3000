const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const {
  getMessages,
  sendMessage,
  uploadImage,
  getLimit,
  markRead,
} = require('../controllers/messageController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

router.get('/', auth, getMessages);
router.post('/', auth, sendMessage);
router.post('/upload', auth, upload.single('image'), uploadImage);
router.get('/limit', auth, getLimit);
router.post('/read', auth, markRead);

module.exports = router;
