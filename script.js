import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, set, update, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =================== FIREBASE CONFIG ===================
// Thay bằng config của bạn
const firebaseConfig = {
  apiKey: "AIzaSyC1VtGLhBqBGQURqoV6OVk7PEhBKCyf6-M",
  authDomain: "skibidi-37b6d.firebaseapp.com",
  databaseURL: "https://skibidi-37b6d-default-rtdb.firebaseio.com/",
  projectId: "skibidi-37b6d",
  storageBucket: "skibidi-37b6d.firebasestorage.app",
  messagingSenderId: "1087339530724",
  appId: "1:1087339530724:web:4167ee61b89da9b8a99ff1"
};

// =================== INIT ===================
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// =================== DỮ LIỆU SHOP ===================
const items = {
    dough: { name: "Dough Fruit", price: 500, img: "https://static.wikia.nocookie.net/blox-fruits/images/9/98/DoughFruit.png" },
    portal: { name: "Portal Fruit", price: 200, img: "https://static.wikia.nocookie.net/blox-fruits/images/7/7c/PortalFruit.png" }
};

// =================== LOGIN ẨN DANH ===================
signInAnonymously(auth);

let currentUserUID = "";
const ADMIN_UID = "YOUR_ADMIN_UID"; // Thay bằng UID của bạn

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUID = user.uid;
        document.getElementById("userInfo").innerText = `Bạn đã đăng nhập: ${currentUserUID}`;
        if(currentUserUID === ADMIN_UID) {
            document.getElementById("adminPanel").style.display = "block";
        }
        // Tạo user trong db nếu chưa có
        const userRef = ref(db, "users/" + currentUserUID);
        get(userRef).then(snap => {
            if(!snap.exists()){
                set(userRef, { points: 1000 }); // mặc định 1000 points
            }
        }).then(loadShop);
    }
});

// =================== LOAD SHOP ===================
function loadShop() {
    const shopDiv = document.getElementById("shop");
    shopDiv.innerHTML = "";

    Object.keys(items).forEach(id => {
        const item = items[id];
        const stockRef = ref(db, "stock/" + id);

        get(stockRef).then(snapshot => {
            const stock = snapshot.val() ?? 0;

            // Load points
            get(ref(db, "users/" + currentUserUID + "/points")).then(snap => {
                const points = snap.val() ?? 0;
                document.getElementById("pointsDisplay").innerText = `Points: ${points}`;
            });

            // Mỗi món
            const div = document.createElement("div");
            div.className = "item";
            div.innerHTML = `
                <h2>${item.name}</h2>
                <img src="${item.img}">
                <p>Giá: ${item.price} points</p>
                <p>Stock: <b>${stock}</b></p>
                <div class="admin-controls">
                    ${currentUserUID===ADMIN_UID?`<button class="stock-btn" onclick="changeStock('${id}', -1)">-1</button>`:""}
                    <button class="buy-btn" onclick="buyItem('${id}')">Mua</button>
                    ${currentUserUID===ADMIN_UID?`<button class="stock-btn" onclick="changeStock('${id}', 1)">+1</button>`:""}
                </div>
            `;
            shopDiv.appendChild(div);
        });
    });
}

// =================== BUY ITEM ===================
window.buyItem = function(id) {
    const userRef = ref(db, "users/" + currentUserUID);
    const stockRef = ref(db, "stock/" + id);

    get(userRef).then(snap => {
        let points = snap.val()?.points ?? 0;
        const price = items[id].price;

        if(points < price){
            alert("❌ Không đủ points!");
            return;
        }

        get(stockRef).then(stockSnap=>{
            let stock = stockSnap.val() ?? 0;
            if(stock <= 0){
                alert("❌ Hết hàng!");
                return;
            }

            // Trừ points + trừ stock
            update(userRef, { points: points - price });
            set(stockRef, stock-1);

            // Lưu lịch sử đơn hàng
            const orderRef = ref(db, "orders/" + currentUserUID);
            push(orderRef, { item: id, time: new Date().toISOString() });

            alert(`✅ Bạn đã mua ${items[id].name} thành công!`);
            loadShop();
        });
    });
};

// =================== CHANGE STOCK ===================
window.changeStock = function(id, amount){
    const stockRef = ref(db, "stock/" + id);
    get(stockRef).then(snap=>{
        let stock = snap.val() ?? 0;
        let newStock = stock + amount;
        if(newStock < 0) newStock = 0;
        set(stockRef, newStock).then(()=>{
            alert(`Stock ${id} = ${newStock}`);
            loadShop();
        });
    });
};
