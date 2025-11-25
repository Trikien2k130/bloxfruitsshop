 // Import Firebase (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Firebase config của bạn
const firebaseConfig = {
  apiKey: "AIzaSyC1VtGLhBqBGQURqoV6OVk7PEhBKCyf6-M",
  authDomain: "skibidi-37b6d.firebaseapp.com",
  databaseURL: "https://skibidi-37b6d-default-rtdb.firebaseio.com",
  projectId: "skibidi-37b6d",
  storageBucket: "skibidi-37b6d.firebasestorage.app",
  messagingSenderId: "1087339530724",
  appId: "1:1087339530724:web:4167ee61b89da9b8a99ff1",
  measurementId: "G-4YRNV49HHX"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// ============================
// LẤY POINTS NGƯỜI DÙNG (demo)
// ============================
async function getPoints(userId) {
  const snapshot = await get(ref(db, "users/" + userId + "/points"));

  if (snapshot.exists()) {
    return snapshot.val();
  } else {
    return 0;
  }
}


// ============================
// CỘNG POINTS  
// ============================
async function addPoints(userId, amount) {
  let current = await getPoints(userId);
  update(ref(db, "users/" + userId), {
    points: current + amount
  });
}


// ============================
// MUA HÀNG
// ============================
async function buyItem(userId, itemName, cost) {
  let points = await getPoints(userId);

  if (points < cost) {
    alert("❌ Không đủ points để mua!");
    return;
  }

  update(ref(db, "users/" + userId), {
    points: points - cost,
    lastOrder: itemName
  });

  alert("✅ Mua hàng thành công: " + itemName);
}


// ============================
// GẮN NÚT BUY VÀO HTML
// ============================
document.getElementById("buyDough").addEventListener("click", () => {
  buyItem("USER123", "Dough Fruit", 500);
});

document.getElementById("buyPortal").addEventListener("click", () => {
  buyItem("USER123", "Portal Fruit", 200);
});
