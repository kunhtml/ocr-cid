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
const cidHistory = [];
const historyContainerTitle = document.querySelector("#history-container h2");

const selectGetcidproButton = document.getElementById("select-getcidpro");
const selectPidkeyButton = document.getElementById("select-pidkey");
const apiSelectionDiv = document.getElementById("api-selection");
const apiStatusDiv = document.getElementById("api-status");

const keyCheckContainer = document.getElementById("key-check-container");
const keyInput = document.getElementById("key-input");
const checkKeyButton = document.getElementById("check-key-button");
const keyResultDiv = document.getElementById("key-result");
const keyHistoryList = document.getElementById("key-history-list");
const keyHistory = [];

const homeBtn = document.getElementById("home-btn");
const paymentBtn = document.getElementById("payment-btn");
const loginLogoutBtn = document.getElementById("login-logout-btn");
const dashboardBtn = document.getElementById("dashboard-btn");

let selectedApi = null;
let cidQueue = [];
let processingCIDs = {};
const CID_POLLING_INTERVAL = 5000;
let isLoggedIn = false;

function formatCID(cid, blockSize = 7) {
  if (!cid) return "";
  const parts = [];
  for (let i = 0; i < cid.length; i += blockSize) {
    parts.push(cid.substring(i, Math.min(i + blockSize, cid.length)));
  }
  return parts.join("-");
}

function updateCidHistoryDisplay() {
  cidHistoryList.innerHTML = "";
  historyContainerTitle.innerText = `Lịch sử CID - Tổng số đã dùng: ${cidHistory.length}`;
  const recentHistory = cidHistory.slice(-10).reverse();
  let index = 1;

  recentHistory.forEach((item) => {
    const listItem = document.createElement("li");
    const displayTimestamp = new Date(item.timestamp); // Keep using local time for display on page if needed
    const formattedDisplayTime =
      displayTimestamp.toLocaleTimeString("vi-VN", {
        // Display time in local (Vietnamese)
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) +
      " " +
      displayTimestamp.toLocaleDateString("vi-VN");
    const formattedInstallationId = formatCID(item.installationId, 7);

    listItem.innerHTML = `<strong>${index}. Thời gian:</strong> ${formattedDisplayTime}<br><strong>ID:</strong> ${formattedInstallationId}<br><strong>CID:</strong> ${item.cid} `;

    const copyHistoryButton = document.createElement("button");
    copyHistoryButton.innerText = "Copy";
    copyHistoryButton.style.marginLeft = "10px";
    copyHistoryButton.style.cursor = "pointer";
    copyHistoryButton.addEventListener("click", () => {
      // --- Start Timezone Conversion and Formatting ---
      const dateObject = new Date(item.timestamp); // Create Date object from original timestamp // 1. Format Date Part in Malaysian Timezone (Asia/Kuala_Lumpur) // Use 'en-GB' locale for DD/MM/YYYY format, includes weekday short.

      const dateString = dateObject
        .toLocaleDateString("en-GB", {
          timeZone: "Asia/Kuala_Lumpur",
          weekday: "short", // e.g., "Tue"
          day: "2-digit", // e.g., "01"
          month: "2-digit", // e.g., "04"
          year: "numeric", // e.g., "2025"
        })
        .replace(/,/g, ""); // Remove potential commas added by locale formatting // 2. Format Time Part (HH:MM:SS) in Malaysian Timezone // Use 'en-US' or similar locale that reliably gives HH:MM:SS with hour12: false

      const timeStringHHMMSS = dateObject.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kuala_Lumpur",
        hour: "2-digit", // e.g., "22" (forces 24-hour format)
        minute: "2-digit", // e.g., "40"
        second: "2-digit", // e.g., "43"
        hour12: false, // Use 24-hour format
      }); // 3. Get Milliseconds (Timezone independent for a given instant) // Extract from the original date object and format

      const milliseconds = String(dateObject.getMilliseconds())
        .padStart(3, "0")
        .substring(0, 2); // 4. Construct the final DATE and TIME lines

      const dateLine = `DATE: ${dateString}`; // dateString already contains "Day DD/MM/YYYY"
      const timeString = `${timeStringHHMMSS}.${milliseconds}`;
      const timeLine = `TIME: ${timeString} GMT+8`; // Append the correct label // 5. Initialize textToCopy with the Malaysia-time formatted strings

      let textToCopy = `${dateLine}\n${timeLine}\n\nInstallation ID : ${formattedInstallationId}\nEnter Confirmation ID\u00A0`; // --- End Timezone Conversion and Formatting ---
      const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
      let cidParts = [];
      if (item.apiSource === "pidkey") {
        cidParts = item.cid.split("--");
      } else if (item.apiSource === "getcidpro") {
        cidParts = item.cid.split("-");
      }
      for (let i = 0; i < cidParts.length; i++) {
        textToCopy += `\n${letters[i]} : ${cidParts[i]}`;
      }
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          // Optional: Add visual feedback
          copyHistoryButton.innerText = "Đã Copy!";
          setTimeout(() => {
            copyHistoryButton.innerText = "Copy";
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err); // Optional: Show error feedback
          copyHistoryButton.innerText = "Lỗi Copy!";
          setTimeout(() => {
            copyHistoryButton.innerText = "Copy";
          }, 2000);
        });
    });

    const retryCidButton = document.createElement("button");
    retryCidButton.innerText = "Lấy lại CID";
    retryCidButton.style.marginLeft = "10px";
    retryCidButton.style.cursor = "pointer";
    retryCidButton.addEventListener("click", () => {
      handleCidRequest(item.installationId);
    });

    listItem.appendChild(copyHistoryButton);
    listItem.appendChild(retryCidButton); // ... rest of the styling ...
    listItem.style.marginBottom = "15px";
    listItem.style.borderBottom = "1px solid #f0f0f0";
    listItem.style.paddingBottom = "10px";
    listItem.style.display = "flex";
    listItem.style.alignItems = "center";
    listItem.style.justifyContent = "space-between";
    listItem.style.padding = "15px";

    cidHistoryList.appendChild(listItem);
    index++;
  });
}

function updateKeyHistoryDisplay() {
  keyHistoryList.innerHTML = "";
  const historyTitle = document.createElement("h3");
  historyTitle.innerText = `Key History (${keyHistory.length})`;
  historyTitle.style.margin = "10px 0";
  keyHistoryList.appendChild(historyTitle);

  keyHistory
    .slice(-10)
    .reverse()
    .forEach((item) => {
      const listItem = document.createElement("li");
      const formattedTime = new Date(item.timestamp).toLocaleString("vi-VN");

      listItem.innerHTML = `
      <div><strong>Time:</strong> ${formattedTime}</div>
      <div><strong>Key:</strong> ${item.keyname_with_dash}</div>
      <div><strong>Product:</strong> ${item.prd}</div>
      <div><strong>Error:</strong> ${item.errorcode}</div>
      <div><strong>Remaining:</strong> ${item.remaining}</div>
    `;

      const buttonContainer = document.createElement("div");
      buttonContainer.style.display = "flex";
      buttonContainer.style.gap = "10px";
      buttonContainer.style.marginTop = "10px";

      const copyKeyButton = document.createElement("button");
      copyKeyButton.innerText = "Copy";
      copyKeyButton.style.marginLeft = "0";
      copyKeyButton.style.cursor = "pointer";
      copyKeyButton.addEventListener("click", () => {
        navigator.clipboard
          .writeText(item.keyname_with_dash)
          .then(() => {
            copyKeyButton.innerText = "Copied!";
            setTimeout(() => (copyKeyButton.innerText = "Copy"), 2000);
          })
          .catch((err) => console.error("Copy failed:", err));
      });

      const recheckKeyButton = document.createElement("button");
      recheckKeyButton.innerText = "Check lại Key";
      recheckKeyButton.style.marginLeft = "0";
      recheckKeyButton.style.cursor = "pointer";
      recheckKeyButton.addEventListener("click", () => {
        checkKey(item.keyname_with_dash);
      });

      buttonContainer.appendChild(copyKeyButton);
      buttonContainer.appendChild(recheckKeyButton);
      listItem.appendChild(buttonContainer);
      listItem.style.marginBottom = "10px";
      listItem.style.padding = "10px";
      listItem.style.borderBottom = "1px solid #ddd";
      keyHistoryList.appendChild(listItem);
    });
}

function extractKeys(inputText) {
  // Regular expression to find potential Windows product keys
  const keyRegex =
    /[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}/g;
  const matches = inputText.match(keyRegex);
  return matches ? matches : [];
}

async function checkKey(keys) {
  if (!Array.isArray(keys) || keys.length === 0) {
    keyResultDiv.innerText = "Vui lòng nhập ít nhất một key.";
    return;
  } // --- Modification Start ---

  keyResultDiv.innerHTML = `Đang kiểm tra ${keys.length} key...<br>`; // Clear previous results, start message
  const keptKeyInfosThisCheck = []; // Store keys kept in this specific check run
  let keptKeysCount = 0;
  let discardedKeysCount = 0;
  const discardErrorCodes = ["0XC004C060", "0XC004C003"]; // Define codes to discard (uppercase) // --- Modification End --- // Process each key sequentially
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const currentKeyIndex = i + 1;
    try {
      const encodedKey = encodeURIComponent(key); // --- Using the proxy endpoint if available, otherwise direct URL --- // Assuming you have a proxy endpoint like /pidkey-proxy?keys=...&justgetdescription=1 // const apiUrl = `/pidkey-proxy?keys=${encodedKey}&justgetdescription=1`; // If no proxy, use the direct URL (ensure CORS is handled if run in browser context directly)
      const apiUrl = `https://pidkey.com/ajax/pidms_api?keys=${encodedKey}&justgetdescription=0&apikey=6SIYpRercJOFtUrx7OjYahpu5`; // --- --- ---
      const response = await fetch(apiUrl); // Check if response is ok, otherwise handle error
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const data = await response.json();

      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        const keyErrorCode = (result.errorcode || "N/A").toUpperCase(); // Get error code, uppercase for comparison // --- Filtering Logic ---

        if (discardErrorCodes.includes(keyErrorCode)) {
          // Discard this key
          discardedKeysCount++;
          keyResultDiv.innerHTML += `
            <div style="margin-bottom: 10px; color: gray;">
              <strong>Key ${currentKeyIndex}:</strong> ${
            result.keyname_with_dash || key
          }<br>
              <strong>Trạng thái:</strong> Đã loại bỏ (Lỗi: ${
            result.errorcode || "N/A"
          })
            </div>
          `;
        } else {
          // Keep this key
          keptKeysCount++;
          const keyInfo = {
            keyname_with_dash: result.keyname_with_dash || key, // Use original key if formatted one is missing
            prd: result.prd || "N/A",
            errorcode: result.errorcode || "N/A",
            remaining: result.remaining || "N/A",
            timestamp: new Date().getTime(),
          }; // Append result for this kept key

          keyResultDiv.innerHTML += `
            <div style="margin-bottom: 15px;">
              <strong>Key ${currentKeyIndex}:</strong> ${keyInfo.keyname_with_dash}<br>
              <strong>Sản phẩm:</strong> ${keyInfo.prd}<br>
              <strong>Mã lỗi:</strong> ${keyInfo.errorcode}<br>
              <strong>Còn lại:</strong> ${keyInfo.remaining}
            </div>
          `;
          keptKeyInfosThisCheck.push(keyInfo); // Add to the list of keys kept in this run
        } // --- End Filtering Logic ---
      } else {
        // Handle cases where API returns unexpected data structure or empty array
        keyResultDiv.innerHTML += `
           <div style="margin-bottom: 15px; color: orange;">
             <strong>Key ${currentKeyIndex}:</strong> ${key}<br>
             <strong>Kết quả:</strong> Không nhận được dữ liệu hợp lệ từ API
           </div>
         `;
      }
    } catch (error) {
      console.error(`Lỗi khi kiểm tra key ${key}:`, error);
      keyResultDiv.innerHTML += `
        <div style="margin-bottom: 15px; color: red;">
          <strong>Key ${currentKeyIndex}:</strong> ${key}<br>
          <strong>Kết quả:</strong> Lỗi khi kiểm tra key (${error.message})
        </div>
      `;
    } // Optional: Add a small delay if hitting API limits is a concern // await new Promise(resolve => setTimeout(resolve, 100));
  } // --- Modification Start: Summary and History Update --- // Append summary message

  keyResultDiv.innerHTML += `
    <hr>
    <div style="margin-top: 15px; font-weight: bold;">
      Tổng kết: Giữ lại ${keptKeysCount} key, loại bỏ ${discardedKeysCount} key (do lỗi ${discardErrorCodes.join(
    " hoặc "
  )}).
    </div>
  `; // Add only the kept keys from this check run to the global history

  if (keptKeyInfosThisCheck.length > 0) {
    keyHistory.push(...keptKeyInfosThisCheck);
    updateKeyHistoryDisplay(); // Update the history list display
  } // --- Modification End ---
}

dropArea.style.display = "none";
manualIdInput.style.display = "flex";

selectGetcidproButton.addEventListener("click", () => {
  selectedApi = "getcidpro";
  apiStatusDiv.innerText = "Đang sử dụng API: getcid.pro";
  checkBalanceButton.click();
  dropArea.style.display = "block";
  resetResults();
});

selectPidkeyButton.addEventListener("click", () => {
  selectedApi = "pidkey";
  apiStatusDiv.innerText = "Đang sử dụng API: pidkey.com";
  dropArea.style.display = "block";
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

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("highlight");
});

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("highlight");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("highlight");
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

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

async function handleCidRequest(installationId) {
  if (!cidQueue.includes(installationId) && !processingCIDs[installationId]) {
    cidQueue.push(installationId);
    addToCidHistory(installationId, "Đang lấy CID", selectedApi);
    processCidQueue();
  } else if (processingCIDs[installationId]) {
    alert(`Đang lấy CID cho Installation ID: ${installationId}`);
  } else if (
    cidHistory.find(
      (item) =>
        item.installationId === installationId && item.cid !== "Đang lấy CID"
    )
  ) {
    alert(`CID cho Installation ID: ${installationId} đã được lấy.`);
  } else {
    alert(`Installation ID: ${installationId} đã có trong hàng đợi.`);
  }
}

function addToCidHistory(
  installationId,
  cid = "Đang lấy CID",
  apiSource = selectedApi
) {
  const timestamp = new Date().getTime();
  const existingIndex = cidHistory.findIndex(
    (item) =>
      item.installationId === installationId && item.cid === "Đang lấy CID"
  );
  if (existingIndex !== -1 && cid !== "Đang lấy CID") {
    cidHistory[existingIndex] = { installationId, cid, timestamp, apiSource };
  } else if (
    !cidHistory.find(
      (item) => item.installationId === installationId && item.cid === cid
    )
  ) {
    cidHistory.push({ installationId, cid, timestamp, apiSource });
  }
  updateCidHistoryDisplay();
}

async function processCidQueue() {
  if (cidQueue.length > 0) {
    const currentIID = cidQueue.shift();
    processingCIDs[currentIID] = true;
    startFetchingCid(currentIID, selectedApi);
  }
}

async function startFetchingCid(iid, api) {
  if (api === "getcidpro") {
    const cidApiUrl = `/getcid-proxy?iid=${iid}`;
    try {
      const response = await fetch(cidApiUrl);
      const data = await response.json();
      if (data && data.cid) {
        const formattedCID = formatCID(data.cid, 6);
        addToCidHistory(iid, formattedCID, api);
        delete processingCIDs[iid];
        processCidQueue();
      } else {
        startCidPolling(iid, api);
      }
    } catch (error) {
      console.error(`Lỗi khi gọi API lấy CID (${api}):`, error);
      addToCidHistory(iid, "Lỗi khi lấy CID", api);
      delete processingCIDs[iid];
      processCidQueue();
    }
  } else if (api === "pidkey") {
    startCidPolling(iid, api);
  }
}

function startCidPolling(iid, api) {
  const intervalId = setInterval(async () => {
    const cid = await checkCidStatus(iid, api);
    if (cid) {
      addToCidHistory(iid, cid, api);
      delete processingCIDs[iid];
      clearInterval(intervalId);
      processCidQueue();
    } else if (!processingCIDs[iid]) {
      clearInterval(intervalId);
    }
  }, CID_POLLING_INTERVAL);
  processingCIDs[iid] = intervalId;
}

async function checkCidStatus(iid, api) {
  if (api === "getcidpro") {
    const cidApiUrl = `/getcid-proxy?iid=${iid}`;
    try {
      const response = await fetch(cidApiUrl);
      const data = await response.json();
      if (data && data.cid) {
        return formatCID(data.cid, 6);
      }
    } catch (error) {
      console.error(`Lỗi polling CID (${api}):`, error);
      delete processingCIDs[iid];
    }
  } else if (api === "pidkey") {
    const checkCidApiUrl = `/check-cid-proxy?iid=${iid}`;
    try {
      const response = await fetch(checkCidApiUrl);
      const data = await response.json();
      if (data && data.have_cid === 1 && data.confirmationid) {
        return formatCID(data.confirmationid);
      } else if (
        data &&
        data.result &&
        data.result.includes("Please upgrade")
      ) {
        const getCidFromIidApiUrl = `/get-cid-from-iid-proxy?iid=${iid}`;
        const getCidResponse = await fetch(getCidFromIidApiUrl);
        const getCidData = await getCidResponse.json();
        if (getCidData && getCidData.confirmationid) {
          return formatCID(getCidData.confirmationid);
        }
      }
    } catch (error) {
      console.error(`Lỗi polling CID (${api}):`, error);
      delete processingCIDs[iid];
    }
  }
  return null;
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
      const installationIdWithoutSpaces = installationIdWithSpaces.replace(
        /\s/g,
        ""
      );
      const formattedInstallationId = formatCID(installationIdWithoutSpaces);
      resultDiv.innerText = `Mã cài đặt: ${formattedInstallationId}`;
      manualIdInput.value = installationIdWithSpaces;
      copyButton.style.display = "inline-block";
      copySuccessMessage.innerText = "";
      cidResultDiv.innerHTML = "";
      cidErrorContainer.innerHTML = "";
      handleCidRequest(installationIdWithoutSpaces);
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
  const manualInstallationIdWithSpaces = manualIdInput.value.trim();
  if (manualInstallationIdWithSpaces) {
    const manualInstallationIdWithoutSpaces =
      manualInstallationIdWithSpaces.replace(/-/g, "");
    const formattedInstallationId = formatCID(
      manualInstallationIdWithoutSpaces
    );
    resultDiv.innerText = `Mã cài đặt: ${formattedInstallationId}`;
    copyButton.style.display = "inline-block";
    copySuccessMessage.innerText = "";
    cidResultDiv.innerHTML = "";
    cidErrorContainer.innerHTML = "";
    handleCidRequest(manualInstallationIdWithoutSpaces);
  } else {
    resultDiv.innerText = "Vui lòng nhập Mã cài đặt.";
    copyButton.style.display = "none";
    copySuccessMessage.innerText = "";
    cidResultDiv.innerHTML = "";
    cidErrorContainer.innerHTML = "";
  }
});

function displayCidResult(formattedCID, apiSource) {
  const cidTextSpan = document.createElement("span");
  let displayedCID = "";
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
  let cidParts = [];

  if (apiSource === "pidkey") {
    cidParts = formattedCID.split("--");
    for (let i = 0; i < cidParts.length; i++) {
      displayedCID += `${letters[i]} : ${cidParts[i]}\n`;
    }
  } else if (apiSource === "getcidpro") {
    cidParts = formattedCID.split("-");
    for (let i = 0; i < Math.min(cidParts.length, 8); i++) {
      displayedCID += `${letters[i]} : ${cidParts[i]}\n`;
    }
  }
  cidTextSpan.innerText = `CID:\n${displayedCID.trim()}`;

  const copyCidButton = document.createElement("button");
  copyCidButton.innerText = "Copy CID";
  copyCidButton.style.padding = "8px 15px";
  copyCidButton.style.fontSize = "16px";
  copyCidButton.style.cursor = "pointer";
  copyCidButton.addEventListener("click", async () => {
    try {
      const installationIdWithSpaces = document
        .getElementById("result")
        .innerText.replace("Mã cài đặt: ", "");
      const installationIdWithoutSpaces = installationIdWithSpaces.replace(
        /-/g,
        ""
      );
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
      let textToCopy = `Installation ID : ${formattedInstallationId}\nEnter Confirmation ID\u00A0`;
      const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
      let cidParts = [];

      if (apiSource === "pidkey") {
        cidParts = formattedCID.split("--");
        for (let i = 0; i < cidParts.length; i++) {
          textToCopy += `\n${letters[i]} : ${cidParts[i]}`;
        }
      } else if (apiSource === "getcidpro") {
        cidParts = formattedCID.split("-");
        for (let i = 0; i < Math.min(cidParts.length, 8); i++) {
          textToCopy += `\n${letters[i]} : ${cidParts[i]}`;
        }
      }

      await navigator.clipboard.writeText(textToCopy);
      const copyCidSuccessMessage = document.createElement("span");
      copyCidSuccessMessage.innerText = " Đã sao chép!";
      copyCidSuccessMessage.style.color = "green";
      cidResultDiv.appendChild(copyCidSuccessMessage);
      setTimeout(() => copyCidSuccessMessage.remove(), 2000);
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
}

copyButton.addEventListener("click", async () => {
  const installationId = resultDiv.innerText.replace("Mã cài đặt: ", "");
  try {
    await navigator.clipboard.writeText(installationId);
    copySuccessMessage.innerText = "Đã sao chép!";
    setTimeout(() => (copySuccessMessage.innerText = ""), 2000);
  } catch (err) {
    console.error("Không thể sao chép ID:", err);
    copySuccessMessage.innerText = "Lỗi khi sao chép ID.";
  }
});

dropArea.addEventListener("dragenter", resetResults);

fileInput.addEventListener("click", resetResults);

checkBalanceButton.addEventListener("click", async () => {
  balanceResultDiv.innerText = "Đang kiểm tra số dư...";
  try {
    const balanceResponse = await fetch("/balance-proxy");
    const balanceData = await balanceResponse.json();
    let balanceText = "";
    for (const key in balanceData) {
      if (balanceData.hasOwnProperty(key)) {
        balanceText += `${key}: ${balanceData[key]}\n`;
      }
    }
    balanceResultDiv.innerText = `Số dư:\n${balanceText.trim()}`;
  } catch (error) {
    console.error("Lỗi khi kiểm tra số dư:", error);
    balanceResultDiv.innerText = "Lỗi khi kiểm tra số dư.";
  }
});

checkKeyButton.addEventListener("click", () => {
  const keysInput = keyInput.value.trim();
  if (keysInput) {
    const extractedKeys = extractKeys(keysInput);
    if (extractedKeys.length > 0) {
      checkKey(extractedKeys);
      keyInput.value = "";
    } else {
      keyResultDiv.innerText = "Không tìm thấy key hợp lệ.";
    }
  } else {
    keyResultDiv.innerText = "Vui lòng nhập ít nhất một key.";
  }
});

keyInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    checkKeyButton.click();
  }
});

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
  } else {
    // Handle paste event for text to extract keys
    const pastedText = (e.clipboardData || window.clipboardData).getData(
      "text"
    );
    if (pastedText) {
      const extractedKeys = extractKeys(pastedText);
      if (extractedKeys.length > 0) {
        checkKey(extractedKeys);
        keyInput.value = ""; // Optionally clear the input field after pasting
      } else if (keyInput.value.trim() === "" && pastedText.trim() !== "") {
        keyResultDiv.innerText =
          "Không tìm thấy key hợp lệ trong dữ liệu đã dán.";
      }
    }
  }
});

// Navbar event listeners
homeBtn.addEventListener("click", (e) => {
  e.preventDefault();
  alert("Redirect to Home page (placeholder)");
});

paymentBtn.addEventListener("click", (e) => {
  e.preventDefault();
  alert("Redirect to Payment page (placeholder)");
});

loginLogoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (isLoggedIn) {
    isLoggedIn = false;
    loginLogoutBtn.innerText = "Login";
    alert("Logged out (placeholder)");
  } else {
    isLoggedIn = true;
    loginLogoutBtn.innerText = "Logout";
    alert("Logged in (placeholder)");
  }
});

dashboardBtn.addEventListener("click", (e) => {
  e.preventDefault();
  alert("Redirect to Dashboard page (placeholder)");
});
