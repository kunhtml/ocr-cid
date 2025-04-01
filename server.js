const express = require("express");
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("node:fs").promises;
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args)); // Import node-fetch bằng dynamic import
const dotenv = require("dotenv");

dotenv.config(); // Tải các biến môi trường từ file .env

const app = express();
const port = process.env.PORT || 3000;

// Middleware để phục vụ các tệp tĩnh từ thư mục hiện tại
app.use(express.static("."));

app.use(bodyParser.json({ limit: "5mb" })); // Tăng giới hạn kích thước body để xử lý ảnh lớn hơn

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PIDKEY_API_KEY = process.env.PIDKEY_API_KEY;
const GETCID_PRO_TOKEN = process.env.GETCID_PRO_TOKEN;

if (!GEMINI_API_KEY) {
    console.error("Lỗi: Chưa thiết lập khóa API Gemini trong file .env");
    process.exit(1);
}

if (!PIDKEY_API_KEY) {
    console.warn("Cảnh báo: Chưa thiết lập khóa API Pidkey trong file .env");
    // Ứng dụng có thể hoạt động mà không cần khóa này nếu không sử dụng chức năng kiểm tra key
}

if (!GETCID_PRO_TOKEN) {
    console.warn("Cảnh báo: Chưa thiết lập token GetCID Pro trong file .env");
    // Ứng dụng có thể hoạt động mà không cần token này nếu không sử dụng chức năng lấy CID từ getcid.pro
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function ocrInstallationId(base64Image, mimeType) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt =
            "Trích xuất Mã cài đặt (Installation ID) từ hình ảnh này. Mã cài đặt thường là một dãy số gồm 9 nhóm, mỗi nhóm có 7 chữ số và được phân tách bằng dấu cách.";

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType,
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;

        if (response && response.candidates && response.candidates.length > 0) {
            const text = response.candidates[0].content.parts[0].text;
            const installationIdRegex = /(\d{7}\s?){9}/g;
            const match = text.match(installationIdRegex);

            if (match && match.length > 0) {
                // Lấy kết quả trùng khớp đầu tiên (nếu có nhiều)
                return match[0].trim(); // trim() để loại bỏ khoảng trắng thừa ở đầu hoặc cuối
            } else {
                return "Không tìm thấy Mã cài đặt.";
            }
        } else {
            return "Không thể xử lý hình ảnh hoặc không tìm thấy văn bản.";
        }
    } catch (error) {
        console.error("Lỗi khi xử lý hình ảnh:", error);
        return { error: "Đã xảy ra lỗi trong quá trình xử lý hình ảnh." };
    }
}

app.post("/ocr", async (req, res) => {
    const { image, mimeType } = req.body;
    if (!image || !mimeType) {
        return res
            .status(400)
            .json({ error: "Vui lòng cung cấp dữ liệu hình ảnh và loại MIME." });
    }

    const result = await ocrInstallationId(image, mimeType);
    res.json({ installationId: result });
});

// Proxy API để lấy CID từ getcid.pro
app.get("/getcid-proxy", async (req, res) => {
    const iid = req.query.iid;
    const token = GETCID_PRO_TOKEN;
    const cidApiUrl = `http://getcid.pro:8085/getcid?token=${token}&iid=${iid}`;

    try {
        const cidResponse = await fetch(cidApiUrl);
        const cidData = await cidResponse.json(); // Thay đổi thành .json() để nhận đối tượng JSON
        res.json(cidData); // Gửi phản hồi JSON từ API gốc về cho client
    } catch (error) {
        console.error("Lỗi khi gọi API lấy CID từ proxy (getcid.pro):", error);
        res.status(500).send("Lỗi khi lấy CID từ server (getcid.pro).");
    }
});

// Proxy API để kiểm tra xem IID đã có CID chưa (justforcheck=1) từ pidkey.com
app.get("/check-cid-proxy", async (req, res) => {
    const iid = req.query.iid;
    const apiKey = PIDKEY_API_KEY;
    const cidApiUrl = `https://pidkey.com/ajax/cidms_api?iids=${iid}&justforcheck=1&apikey=${apiKey}`;

    try {
        const cidResponse = await fetch(cidApiUrl);
        const cidData = await cidResponse.json();
        res.json(cidData);
    } catch (error) {
        console.error("Lỗi khi gọi API kiểm tra CID (pidkey.com):", error);
        res.status(500).send("Lỗi khi kiểm tra CID trên server (pidkey.com).");
    }
});

// Proxy API để lấy CID từ IID (justforcheck=0) từ pidkey.com
app.get("/get-cid-from-iid-proxy", async (req, res) => {
    const iid = req.query.iid;
    const apiKey = PIDKEY_API_KEY;
    const cidApiUrl = `https://pidkey.com/ajax/cidms_api?iids=${iid}&justforcheck=0&apikey=${apiKey}`;

    try {
        const cidResponse = await fetch(cidApiUrl);
        const cidData = await cidResponse.json();
        res.json(cidData);
    } catch (error) {
        console.error("Lỗi khi gọi API lấy CID từ IID (pidkey.com):", error);
        res.status(500).send("Lỗi khi lấy CID từ server (pidkey.com).");
    }
});

// Proxy API để lấy số dư
app.get("/balance-proxy", async (req, res) => {
    const balanceApiUrl = `http://getcid.pro:8085/balance?token=${GETCID_PRO_TOKEN}`;

    try {
        const balanceResponse = await fetch(balanceApiUrl);
        const balanceData = await balanceResponse.text();
        res.send(balanceData); // Gửi phản hồi từ API gốc về cho client
    } catch (error) {
        console.error("Lỗi khi gọi API lấy số dư từ proxy:", error);
        res.status(500).send("Lỗi khi lấy số dư từ server.");
    }
});

// Endpoint để cung cấp API key Pidkey cho front-end
app.get("/api/get-pidkey-api-key", (req, res) => {
    const apiKey = PIDKEY_API_KEY;
    if (apiKey) {
        res.json({ apiKey });
    } else {
        res
            .status(500)
            .json({ error: "Không tìm thấy API key Pidkey trong biến môi trường." });
    }
});

app.listen(port, () => {
    console.log(`Máy chủ đang chạy tại http://localhost:${port}`);
});
