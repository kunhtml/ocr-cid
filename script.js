const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("file-input");
const resultDiv = document.getElementById("result");
const copyButton = document.getElementById("copy-button");
const copySuccessMessage = document.getElementById("copy-success-message");
const cidResultDiv = document.getElementById("cid-result");
const manualIdInput = document.getElementById("manual-id");
const fetchCidButton = document.getElementById("fetch-cid-button");
const checkBalanceButton = document.getElementById("check-balance-button");
const balanceResultDiv = document.getElementById("balance-result");
const cidErrorContainer = document.getElementById("cid-error-container");
const manualConfirmationIdInput = document.getElementById(
  "manual-confirmation-id-input"
);
const manualConfirmationId = document.getElementById("manual-confirmation-id");
const cidHistoryList = document.getElementById("cid-history-list");
const cidHistory = []; // Mảng để lưu trữ lịch sử CID

const selectGetcidproButton = document.getElementById("select-getcidpro");
const selectPidkeyButton = document.getElementById("select-pidkey");
const apiSelectionDiv = document.getElementById("api-selection");

let selectedApi = null; // Biến để theo dõi API được chọn

// Hàm định dạng CID
function formatCID(cid) {
  if (!cid) return "";
  const parts = [];
  for (let i = 0; i < cid.length; i += 7) {
    parts.push(cid.substring(i, Math.min(i + 7, cid.length)));
  }
  return parts.join("-");
}

function updateCidHistoryDisplay() {
  cidHistoryList.innerHTML = ""; // Xóa lịch sử hiện tại

  // Hiển thị tối đa 10 mục lịch sử gần nhất
  const recentHistory = cidHistory.slice(-10).reverse();

  recentHistory.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.innerHTML = `<strong>ID:</strong> ${item.installationId}<br><strong>CID:</strong> ${item.cid}`;
    listItem.style.marginBottom = "10px";
    listItem.style.borderBottom = "1px solid #f0f0f0";
    listItem.style.paddingBottom = "5px";
    cidHistoryList.appendChild(listItem);
  });
}

// Ẩn khu vực kéo thả ban đầu
dropArea.style.display = "none";
manualIdInput.style.display = "flex"; // Hiển thị ô nhập liệu thủ công ngay từ đầu

// Xử lý sự kiện click nút "Sử dụng getcid.pro"
selectGetcidproButton.addEventListener("click", () => {
  selectedApi = "getcidpro";
  checkBalanceButton.click(); // Gọi kiểm tra số dư ngay khi chọn getcid.pro
  dropArea.style.display = "block";
  apiSelectionDiv.style.display = "none";
  resetResults();
});

// Xử lý sự kiện click nút "Sử dụng pidkey.com"
selectPidkeyButton.addEventListener("click", () => {
  selectedApi = "pidkey";
  dropArea.style.display = "block";
  apiSelectionDiv.style.display = "none";
  resetResults();
});

function resetResults() {
  resultDiv.innerText = "";
  copyButton.style.display = "none";
  copySuccessMessage.innerText = "";
  cidResultDiv.innerHTML = "";
  balanceResultDiv.innerText = "";
  cidErrorContainer.innerHTML = "";
}

// Ngăn chặn hành vi mặc định khi kéo qua
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("highlight");
});

// Loại bỏ lớp highlight khi rời khỏi khu vực kéo thả
dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("highlight");
});

// Xử lý khi thả tệp
dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("highlight");
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

// Xử lý khi chọn tệp bằng input
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  handleFile(file);
});

async function handleFile(file) {
  if (!selectedApi) {
    alert("Vui lòng chọn API trước khi tải ảnh.");
    return;
  }
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target.result.split(",")[1];
      await sendImageToServer(base64Image, file.type);
    };
    reader.onerror = (error) => {
      console.error("Lỗi khi đọc tệp:", error);
      resultDiv.innerText = "Lỗi khi đọc tệp hình ảnh.";
      copyButton.style.display = "none";
      copySuccessMessage.innerText = "";
      cidResultDiv.innerHTML = "";
      cidErrorContainer.innerHTML = "";
    };
    reader.readAsDataURL(file);
    resultDiv.innerText = "Đang xử lý...";
    copyButton.style.display = "none";
    copySuccessMessage.innerText = "";
    cidResultDiv.innerHTML = "";
    cidErrorContainer.innerHTML = "";
  } else {
    resultDiv.innerText = "Vui lòng chọn hoặc dán một tệp hình ảnh.";
    copyButton.style.display = "none";
    copySuccessMessage.innerText = "";
    cidResultDiv.innerHTML = "";
    cidErrorContainer.innerHTML = "";
  }
}

async function sendImageToServer(base64Image, mimeType) {
  try {
    const response = await fetch("/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64Image, mimeType: mimeType }),
    });
    const data = await response.json();
    if (data.installationId) {
      const installationIdWithSpaces = data.installationId;
      const installationId = installationIdWithSpaces.replace(/\s/g, "");
      resultDiv.innerText = `Mã cài đặt: ${installationIdWithSpaces}`;
      manualIdInput.value = installationIdWithSpaces;
      copyButton.style.display = "inline-block";
      copySuccessMessage.innerText = "";

      cidResultDiv.innerHTML = `Đang lấy CID (${selectedApi})...`;
      cidErrorContainer.innerHTML = "";

      if (selectedApi === "getcidpro") {
        const cidApiUrl = `/getcid-proxy?iid=${installationId}`;
        try {
          const cidResponse = await fetch(cidApiUrl);
          const cidData = await cidResponse.json();
          cidResultDiv.innerHTML = "";
          cidErrorContainer.innerHTML = "";
          if (cidData && cidData.cid) {
            const formattedCID = formatCID(cidData.cid);
            displayCidResult(formattedCID);
            checkBalanceButton.click(); // Tự động kiểm tra số dư
          } else if (cidData && cidData.error) {
            cidErrorContainer.innerText = `Lỗi: ${cidData.error}`;
          } else {
            cidResultDiv.innerText = "Không tìm thấy CID.";
          }
        } catch (error) {
          console.error("Lỗi khi gọi API lấy CID (getcid.pro):", error);
          cidResultDiv.innerText = "Lỗi khi lấy CID từ server (getcid.pro).";
          cidErrorContainer.innerHTML = "";
        }
      } else if (selectedApi === "pidkey") {
        const checkCidApiUrl = `/check-cid-proxy?iid=${installationId}`;
        try {
          const checkCidResponse = await fetch(checkCidApiUrl);
          const checkCidData = await checkCidResponse.json();
          cidResultDiv.innerHTML = "";
          cidErrorContainer.innerHTML = "";
          if (
            checkCidData &&
            checkCidData.have_cid === 1 &&
            checkCidData.confirmationid
          ) {
            const formattedCID = formatCID(checkCidData.confirmationid);
            displayCidResult(formattedCID);
          } else if (
            checkCidData &&
            checkCidData.result ===
              'Please upgrade to "Account Professional" to get Confirmation ID for this IID.'
          ) {
            cidResultDiv.innerText = "Đang lấy CID (pidkey.com)...";
            const getCidFromIidApiUrl = `/get-cid-from-iid-proxy?iid=${installationId}`;
            try {
              const getCidResponse = await fetch(getCidFromIidApiUrl);
              const getCidData = await getCidResponse.json();
              if (getCidData && getCidData.confirmationid) {
                const formattedCID = formatCID(getCidData.confirmationid);
                displayCidResult(formattedCID);
              } else {
                cidResultDiv.innerText = "Không tìm thấy CID.";
              }
            } catch (newCidError) {
              console.error(
                "Lỗi khi gọi API lấy CID (pidkey.com):",
                newCidError
              );
              cidResultDiv.innerText =
                "Lỗi khi lấy CID từ server (pidkey.com).";
            }
          } else if (
            checkCidData &&
            checkCidData.status === "failed" &&
            checkCidData.errormsg
          ) {
            cidErrorContainer.innerText = `Trạng thái: ${checkCidData.status}\nLỗi: ${checkCidData.errormsg}`;
          } else {
            cidResultDiv.innerText = "Không tìm thấy CID.";
          }
        } catch (error) {
          console.error("Lỗi khi gọi API kiểm tra CID (pidkey.com):", error);
          cidResultDiv.innerText =
            "Lỗi khi kiểm tra CID từ server (pidkey.com).";
          cidErrorContainer.innerHTML = "";
        }
      }
    } else if (data.error) {
      resultDiv.innerText = `Lỗi: ${data.error}`;
      copyButton.style.display = "none";
      cidResultDiv.innerHTML = "";
      cidErrorContainer.innerHTML = "";
    } else {
      resultDiv.innerText = "Không tìm thấy Mã cài đặt.";
      copyButton.style.display = "none";
      cidResultDiv.innerHTML = "";
      cidErrorContainer.innerHTML = "";
    }
  } catch (error) {
    console.error("Lỗi gửi yêu cầu OCR:", error);
    resultDiv.innerText = "Đã xảy ra lỗi khi gửi yêu cầu.";
    copyButton.style.display = "none";
    cidResultDiv.innerHTML = "";
    cidErrorContainer.innerHTML = "";
  }
}

fetchCidButton.addEventListener("click", async () => {
  if (!selectedApi) {
    alert("Vui lòng chọn API trước khi nhập ID.");
    return;
  }
  const manualInstallationId = manualIdInput.value.trim();
  if (manualInstallationId) {
    const processedId = manualInstallationId.includes("-")
      ? manualInstallationId.replace(/-/g, "")
      : manualInstallationId;
    resultDiv.innerText = `Mã cài đặt: ${manualInstallationId}`;
    copyButton.style.display = "inline-block";
    copySuccessMessage.innerText = "";
    cidResultDiv.innerHTML = `Đang lấy CID (${selectedApi})...`;
    cidErrorContainer.innerHTML = "";

    if (selectedApi === "getcidpro") {
      const cidApiUrl = `/getcid-proxy?iid=${processedId}`;
      try {
        const cidResponse = await fetch(cidApiUrl);
        const cidData = await cidResponse.json();
        cidResultDiv.innerHTML = "";
        cidErrorContainer.innerHTML = "";
        if (cidData && cidData.cid) {
          const formattedCID = formatCID(cidData.cid);
          displayCidResult(formattedCID);
          checkBalanceButton.click(); // Tự động kiểm tra số dư
        } else if (cidData && cidData.error) {
          cidErrorContainer.innerText = `Lỗi: ${cidData.error}`;
        } else {
          cidResultDiv.innerText = "Không tìm thấy CID.";
        }
      } catch (error) {
        console.error("Lỗi khi gọi API lấy CID (getcid.pro):", error);
        cidResultDiv.innerText = "Lỗi khi lấy CID từ server (getcid.pro).";
        cidErrorContainer.innerHTML = "";
      }
    } else if (selectedApi === "pidkey") {
      const checkCidApiUrl = `/check-cid-proxy?iid=${processedId}`;
      try {
        const checkCidResponse = await fetch(checkCidApiUrl);
        const checkCidData = await checkCidResponse.json();
        cidResultDiv.innerHTML = "";
        cidErrorContainer.innerHTML = "";
        if (
          checkCidData &&
          checkCidData.have_cid === 1 &&
          checkCidData.confirmationid
        ) {
          const formattedCID = formatCID(checkCidData.confirmationid);
          displayCidResult(formattedCID);
        } else if (
          checkCidData &&
          checkCidData.result ===
            'Please upgrade to "Account Professional" to get Confirmation ID for this IID.'
        ) {
          cidResultDiv.innerText = "Đang lấy CID (pidkey.com)...";
          const getCidFromIidApiUrl = `/get-cid-from-iid-proxy?iid=${processedId}`;
          try {
            const getCidResponse = await fetch(getCidFromIidApiUrl);
            const getCidData = await getCidResponse.json();
            if (getCidData && getCidData.confirmationid) {
              const formattedCID = formatCID(getCidData.confirmationid);
              displayCidResult(formattedCID);
            } else {
              cidResultDiv.innerText = "Không tìm thấy CID.";
            }
          } catch (newCidError) {
            console.error("Lỗi khi gọi API lấy CID (pidkey.com):", newCidError);
            cidResultDiv.innerText = "Lỗi khi lấy CID từ server (pidkey.com).";
          }
        } else if (
          checkCidData &&
          checkCidData.status === "failed" &&
          checkCidData.errormsg
        ) {
          cidErrorContainer.innerText = `Trạng thái: ${checkCidData.status}\nLỗi: ${checkCidData.errormsg}`;
        } else {
          cidResultDiv.innerText = "Không tìm thấy CID.";
        }
      } catch (error) {
        console.error("Lỗi khi gọi API kiểm tra CID (pidkey.com):", error);
        cidResultDiv.innerText = "Lỗi khi kiểm tra CID từ server (pidkey.com).";
        cidErrorContainer.innerHTML = "";
      }
    } else {
      resultDiv.innerText = "Vui lòng nhập Mã cài đặt.";
      copyButton.style.display = "none";
      copySuccessMessage.innerText = "";
      cidResultDiv.innerHTML = "";
      cidErrorContainer.innerHTML = "";
    }
  }
});

function displayCidResult(formattedCID) {
  const cidTextSpan = document.createElement("span");
  cidTextSpan.innerText = `CID: ${formattedCID} `;

  const copyCidButton = document.createElement("button");
  copyCidButton.innerText = "Copy CID";
  copyCidButton.style.padding = "8px 15px";
  copyCidButton.style.fontSize = "16px";
  copyCidButton.style.cursor = "pointer";
  copyCidButton.addEventListener("click", async () => {
    try {
      // Lấy Mã cài đặt từ resultDiv
      const installationIdWithSpaces = document
        .getElementById("result")
        .innerText.replace("Mã cài đặt: ", "");
      const installationIdWithoutSpaces = installationIdWithSpaces.replace(
        /\s/g,
        ""
      );

      // Định dạng Mã cài đặt với khoảng trắng
      const installationIdParts = [];
      for (let i = 0; i < installationIdWithoutSpaces.length; i += 7) {
        installationIdParts.push(
          installationIdWithoutSpaces.substring(
            i,
            Math.min(i + 7, installationIdWithoutSpaces.length)
          )
        );
      }
      const formattedInstallationId = installationIdParts.join(" ");

      // Tạo nội dung để sao chép (định dạng CID theo yêu cầu mới)
      const cidParts = formattedCID.split("--");
      let textToCopy = `Installation ID : ${formattedInstallationId}\nEnter Confirmation ID\u00A0`; // \u00A0 là ký tự khoảng trắng không ngắt dòng
      const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
      for (let i = 0; i < cidParts.length; i++) {
        textToCopy += `\n${letters[i]} : ${cidParts[i]}`;
      }

      await navigator.clipboard.writeText(textToCopy);
      const copyCidSuccessMessage = document.createElement("span");
      copyCidSuccessMessage.innerText = " Đã sao chép!";
      copyCidSuccessMessage.style.color = "green";
      cidResultDiv.appendChild(copyCidSuccessMessage);
      setTimeout(() => {
        copyCidSuccessMessage.remove();
      }, 2000);
    } catch (err) {
      console.error("Không thể sao chép CID:", err);
      const copyCidErrorMessage = document.createElement("span");
      copyCidErrorMessage.innerText = " Lỗi khi sao chép CID.";
      copyCidErrorMessage.style.color = "red";
      cidResultDiv.appendChild(copyCidErrorMessage);
    }
  });

  cidResultDiv.appendChild(cidTextSpan);
  cidResultDiv.appendChild(copyCidButton);

  // Thêm vào lịch sử và cập nhật hiển thị
  const installationId = document
    .getElementById("result")
    .innerText.replace("Mã cài đặt: ", "");
  cidHistory.push({ installationId: installationId, cid: formattedCID });
  updateCidHistoryDisplay();
}

// Chức năng copy ID vào clipboard
copyButton.addEventListener("click", async () => {
  const installationId = resultDiv.innerText.replace("Mã cài đặt: ", "");
  try {
    await navigator.clipboard.writeText(installationId);
    copySuccessMessage.innerText = "Đã sao chép!";
    setTimeout(() => {
      copySuccessMessage.innerText = "";
    }, 2000);
  } catch (err) {
    console.error("Không thể sao chép ID:", err);
    copySuccessMessage.innerText = "Lỗi khi sao chép ID.";
  }
});

// Reset trạng thái khi kéo thả hoặc chọn tệp mới
dropArea.addEventListener("dragenter", () => {
  resetResults();
});

fileInput.addEventListener("click", () => {
  resetResults();
});

// Xử lý sự kiện click nút kiểm tra số dư
checkBalanceButton.addEventListener("click", async () => {
  balanceResultDiv.innerText = "Đang kiểm tra số dư...";
  try {
    const balanceResponse = await fetch("/balance-proxy");
    const balanceData = await balanceResponse.text();
    balanceResultDiv.innerText = `Số dư: ${balanceData}`;
  } catch (error) {
    console.error("Lỗi khi kiểm tra số dư:", error);
    balanceResultDiv.innerText = "Lỗi khi kiểm tra số dư.";
  }
});

// Xử lý sự kiện dán (Ctrl+V) trên toàn bộ document
document.addEventListener("paste", async (e) => {
  if (!selectedApi) {
    alert("Vui lòng chọn API trước khi dán ảnh.");
    return;
  }
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  let foundImage = false;
  for (let index in items) {
    const item = items[index];
    if (item.type.indexOf("image") === 0) {
      foundImage = true;
      e.preventDefault();
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target.result.split(",")[1];
        const mimeType = event.target.result.substring(
          event.target.result.indexOf(":") + 1,
          event.target.result.indexOf(";")
        );
        await sendImageToServer(base64Image, mimeType);
      };
      reader.onerror = (error) => {
        console.error("Lỗi khi đọc dữ liệu hình ảnh:", error);
        resultDiv.innerText = "Lỗi khi đọc dữ liệu hình ảnh từ clipboard.";
        copyButton.style.display = "none";
        copySuccessMessage.innerText = "";
        cidResultDiv.innerHTML = "";
        cidErrorContainer.innerHTML = "";
      };
      reader.readAsDataURL(blob);
      break;
    }
  }
  if (foundImage) {
    resultDiv.innerText = "Đang xử lý ảnh từ clipboard...";
    copyButton.style.display = "none";
    copySuccessMessage.innerText = "";
    cidResultDiv.innerHTML = "";
    cidErrorContainer.innerHTML = "";
  }
});
