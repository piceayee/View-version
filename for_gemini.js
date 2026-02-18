// 📌 全域範圍變數
let map;
let markers = []; // 儲存所有標記

// 📌 JSON 檔案 URL 列表
const jsonUrls = [
    //"https://piceayee.github.io/jsonhome/data/0310A.json",
  //  "https://piceayee.github.io/jsonhome/data/0310B.json",
    //"https://piceayee.github.io/jsonhome/data/edit1-1.json",
    "https://piceayee.github.io/jsonhome/data/edit2-1.json",
    "https://piceayee.github.io/jsonhome/data/0218.json"
];

// 📌 載入標記的函式，放在全域範圍
async function loadAllMarkersFromGitHub() {
    console.log("📥 開始並行載入所有 JSON 檔案...");
    try {
        const fetchPromises = jsonUrls.map(url => fetch(url).then(response => {
            if (!response.ok) throw new Error(`❌ 無法獲取 JSON: ${url}`);
            return response.json();
        }));
        const allData = await Promise.all(fetchPromises);
        console.log("✅ 所有 JSON 檔案載入完成！");
        allData.forEach(data => {
            if (!Array.isArray(data)) {
                console.error("❌ JSON 格式錯誤，應該是陣列", data);
                return;
            }
            data.forEach(markerData => addMarkerToMap(markerData));
        });
        filterMarkers(); // 載入完成後立即執行篩選
    } catch (error) {
        console.error("❌ 載入 JSON 失敗：", error);
    }
}

// 📌 以下函式都必須放在全域範圍，才能被其他函式呼叫
function updatePopupStyle(img) {
    const popup = img.closest('.leaflet-popup');
    if (!popup) return;
    const isPortrait = img.naturalHeight > img.naturalWidth;
    const portraitWidth = '220px';
    const landscapeWidth = '300px';
    if (isPortrait) {
        img.style.width = portraitWidth;
        img.style.height = 'auto';
    } else {
        img.style.width = landscapeWidth;
        img.style.height = 'auto';
    }
    if (popup._leaflet_popup) {
        popup._leaflet_popup.update();
    }
}

function getCategoryClass(category) {
    switch (category) {
        case "花磚＆裝飾": return "tag-red";
        case "洋樓＆房舍": return "tag-orange";
        case "風獅爺": return "tag-yellow";
        case "軍事": return "tag-green";
        case "其他": return "tag-blue";
        default: return "tag-purple";
    }
}

function addMarkerToMap(markerData) {
    let markerColor = "blue";
    if (markerData.categories) {
        if (markerData.categories.includes("花磚＆裝飾")) {
            markerColor = "red";
        } else if (markerData.categories.includes("洋樓＆房舍")) {
            markerColor = "black";
        } else if (markerData.categories.includes("風獅爺")) {
            markerColor = "yellow";
        } else if (markerData.categories.includes("軍事")) {
            markerColor = "green";
        } else if (markerData.categories.includes("其他")) {
            markerColor = "blue";
        }
    }
    
    let popupContent = `
        <div class="popup-content">
            <strong>${markerData.name}</strong><br>
            <img src="${markerData.image}" class="popup-image" onload="updatePopupStyle(this);"><br>
            📅 拍攝日期: ${markerData.date || "未知日期"}<br>
            <a href="https://www.google.com/maps/search/?api=1&query=${markerData.latitude},${markerData.longitude}" target="_blank" class="gps-link">
                GPS: ${markerData.latitude.toFixed(5)}, ${markerData.longitude.toFixed(5)}
            </a>
        </div>
    `;
    
    let marker = L.marker([markerData.latitude, markerData.longitude], {
        icon: L.icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${markerColor}.png`,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        }),
        categories: markerData.categories || []
    }).addTo(map).bindPopup(popupContent).on("click", function() {
        let currentZoom = map.getZoom();
        let targetZoom = 17;
        let latOffset = (currentZoom === 17) ? 0.003 : 0.0015;
        if (currentZoom < targetZoom) {
            map.flyTo([markerData.latitude + 0.003, markerData.longitude], targetZoom, { duration: 0.8 });
        } else {
            map.panTo([markerData.latitude + latOffset, markerData.longitude]);
        }
    });

    let tagHtml = markerData.categories && markerData.categories.length > 0
        ? markerData.categories.map(cat => `<span class="photo-tag ${getCategoryClass(cat)}">${cat}</span>`).join(" ")
        : `<span class="photo-tag no-category">未分類</span>`;

    marker.categories = markerData.categories || [];
    marker.id = markerData.id;
    markers.push(marker);

    let listItem = document.createElement("div");
    listItem.className = "photo-item";
    listItem.setAttribute("data-id", markerData.id);
    listItem.innerHTML = `
        <img src="${markerData.image}" class="thumbnail">
        <div class="photo-info">
            <span class="photo-name">${markerData.name}</span>
            <div class="category-tags">${tagHtml}</div>
            <button class="go-to-marker">查看</button>
        </div>
    `;

    listItem.querySelector(".go-to-marker").addEventListener("click", function() {
        map.flyTo([markerData.latitude + 0.01, markerData.longitude], 15, {
            duration: 0.8
        });
        marker.openPopup();
        document.getElementById("map").scrollIntoView({
            behavior: "smooth"
        });
    });
    
    listItem.querySelector(".thumbnail").addEventListener("click", function() {
        map.flyTo([markerData.latitude + 0.0105, markerData.longitude], 15, {
            duration: 0.8
        });
        marker.openPopup();
    });

    let photoList = document.getElementById("photoList");
    photoList.prepend(listItem);
    return marker;
}

function filterMarkers() {
    let selectedCategories = Array.from(document.querySelectorAll(".category-filter:checked")).map(input => input.value);
    markers.forEach(marker => {
        let markerCategories = marker.categories || [];
        let isVisible = false;
        if (selectedCategories.includes("未分類")) {
            isVisible = markerCategories.length === 0;
        } else if (selectedCategories.length > 0) {
            isVisible = selectedCategories.some(category => markerCategories.includes(category));
        } else {
            isVisible = true;
        }
        if (isVisible) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
        let photoItem = document.querySelector(`.photo-item[data-id="${marker.id}"]`);
        if (photoItem) {
            photoItem.style.display = isVisible ? "flex" : "none";
        }
    });
}

// 這是唯一的 window.onload 函式，用於網站初始化
window.onload = function() {
    console.log("🔵 頁面載入完成，初始化地圖...");
    const photoList = document.getElementById("photoList");
    if (!photoList) {
        console.error("❌ 找不到某些 HTML 元素，請檢查 HTML！");
        return;
    }
    
    map = L.map("map").setView([24.46, 118.35], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    console.log("✅ 載入 GitHub JSON...");
    loadAllMarkersFromGitHub();

    const modal = document.getElementById("imageModal");
    const fullImage = document.getElementById("fullImage");
    const closeBtn = document.querySelector(".close");
    
    document.addEventListener("click", function(event) {
        if (event.target.tagName === "IMG" && event.target.closest(".leaflet-popup-content")) {
            if (modal) {
                fullImage.src = event.target.src;
                modal.style.display = "flex";
            }
        }
    });
    
    if (closeBtn) {
        closeBtn.addEventListener("click", function() {
            if (modal) modal.style.display = "none";
        });
    }

    if (modal) {
        modal.addEventListener("click", function(event) {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    }

    document.querySelectorAll(".category-filter").forEach(input => {
        input.addEventListener("change", filterMarkers);
    });
};
