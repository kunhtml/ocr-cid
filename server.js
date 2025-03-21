const express = require("express");
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("node:fs").promises;
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args)); // Import node-fetch bằng dynamic import

const app = express();
const port = 3000;

// Middleware để phục vụ các tệp tĩnh từ thư mục hiện tại
app.use(express.static("."));

app.use(bodyParser.json({ limit: "5mb" })); // Tăng giới hạn kích thước body để xử lý ảnh lớn hơn

let API_KEY;

async function loadApiKey() {
  try {
    const apiKeyFromFile = await fs.readFile("./api.txt", "utf8");
    API_KEY = apiKeyFromFile.trim();
    console.log("Khóa API Gemini đã được đọc từ tệp.");
  } catch (error) {
    console.error("Lỗi khi đọc tệp khóa API:", error);
    // Bạn có thể xử lý lỗi này theo cách khác, ví dụ như thoát ứng dụng
    process.exit(1);
  }
}

// Gọi hàm để tải khóa API trước khi khởi động máy chủ
loadApiKey().then(() => {
  const genAI = new GoogleGenerativeAI(API_KEY);

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
    const token = "123"; // Thay YOUR_GETCID_PRO_TOKEN bằng token thật của bạn
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
    const apiKey = "123";
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
    const apiKey = "123";
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
    const balanceApiUrl =
      "http://getcid.pro:8085/balance?token=123"; // Thay YOUR_GETCID_PRO_TOKEN bằng token thật của bạn

    try {
      const balanceResponse = await fetch(balanceApiUrl);
      const balanceData = await balanceResponse.text();
      res.send(balanceData); // Gửi phản hồi từ API gốc về cho client
    } catch (error) {
      console.error("Lỗi khi gọi API lấy số dư từ proxy:", error);
      res.status(500).send("Lỗi khi lấy số dư từ server.");
    }
  });

  app.listen(port, () => {
    console.log(`Máy chủ đang chạy tại http://localhost:${port}`);
  });
});
