// Cấu hình Firebase của bạn
const firebaseConfig = {
    apiKey: "AIzaSyC1VtGLhBqBGQURqoV6OVk7PEhBKCyf6-M",
    authDomain: "skibidi-37b6d.firebaseapp.com",
    databaseURL: "https://skibidi-37b6d-default-rtdb.firebaseio.com/",
    projectId: "skibidi-37b6d",
    storageBucket: "skibidi-37b6d.firebasestorage.app",
    messagingSenderId: "1087339530724",
    appId: "1:1087339530724:web:4167ee61b89da9b8a99ff1"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Lấy tham chiếu đến Realtime Database
const database = firebase.database();
const stockRef = database.ref('stock');
// Đường dẫn điểm số Admin. Trong code này, tôi giả định điểm của admin là 1000
// BẠN CẦN TẠO THÊM PATH NÀY TRONG FIREBASE: /users/admin_user/points: 1000
const USER_UID = "admin_user"; // Dùng tạm 1 key để đọc/ghi điểm trong path /users
const pointsRef = database.ref(`users/${USER_UID}/points`); 
const historyRef = database.ref('purchase_history');

// Biến giả định cho Admin View
// ĐỂ THỰC HIỆN YÊU CẦU: "người khác không thể restock hàng"
// Bạn PHẢI thiết lập Authentication và kiểm tra UID thực. 
// Trong code JS, tôi giả định nếu bạn có ID Admin, bạn sẽ thấy controls.
const IS_ADMIN = true; // Set thành false nếu bạn muốn ẩn các nút [+] và [-]

// --- 1. Hiển thị Điểm số và Tồn kho ---
stockRef.on('value', (snapshot) => {
    const stock = snapshot.val();
    
    // Cập nhật tồn kho Dough
    const doughCount = stock && stock.dough !== undefined ? stock.dough : 0;
    document.getElementById('stock-dough').textContent = doughCount;

    // Cập nhật tồn kho Portal
    const portalCount = stock && stock.portal !== undefined ? stock.portal : 0;
    document.getElementById('stock-portal').textContent = portalCount;

    // Bật/Tắt nút MUA dựa trên tồn kho
    document.querySelectorAll('.product-card').forEach(card => {
        const item = card.dataset.item;
        const stockCountEl = document.getElementById(`stock-${item}`);
        const count = parseInt(stockCountEl.textContent);
        const buyButton = card.querySelector('.btn-buy');
        
        // Nút mua sẽ bị tắt nếu tồn kho <= 0
        buyButton.disabled = count <= 0;
    });
});

// Lắng nghe điểm số
pointsRef.on('value', (snapshot) => {
    const points = snapshot.val();
    document.getElementById('user-points').textContent = points !== null ? points : 0;
});


document.addEventListener('DOMContentLoaded', () => {
    // Hiển thị/Ẩn Admin Controls
    // Nếu IS_ADMIN là false, người dùng sẽ không thấy nút [+] và [-]
    document.querySelectorAll('.admin-controls').forEach(el => {
        el.style.display = IS_ADMIN ? 'inline-block' : 'none';
    });

    // --- 2. Xử lý logic MUA hàng ---
    document.querySelectorAll('.btn-buy').forEach(button => {
        button.addEventListener('click', (e) => {
            const card = e.target.closest('.product-card');
            const item = card.dataset.item;
            const price = parseInt(card.dataset.price);
            const currentPoints = parseInt(document.getElementById('user-points').textContent);
            const stockCountEl = document.getElementById(`stock-${item}`);
            let currentStock = parseInt(stockCountEl.textContent);

            if (currentPoints >= price && currentStock > 0) {
                // 1. Giảm điểm của người dùng (chỉ giảm điểm Admin trong ví dụ này)
                pointsRef.transaction((current) => {
                    return (current || 0) - price;
                });

                // 2. Giảm tồn kho
                stockRef.child(item).transaction((current) => {
                    return (current || 1) - 1; 
                });

                // 3. Ghi vào lịch sử mua hàng
                const newHistoryRef = historyRef.push();
                newHistoryRef.set({
                    item: item,
                    price: price,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });

                alert(`Đã mua thành công ${item}! Trừ ${price} điểm.`);
            } else if (currentStock <= 0) {
                alert(`Xin lỗi, ${item} đã hết hàng.`);
            } else {
                alert(`Không đủ điểm để mua ${item}. Cần ${price} điểm.`);
            }
        });
    });

    // --- 3. Xử lý logic điều chỉnh tồn kho (Admin Only) ---
    document.querySelectorAll('.btn-stock-adjust').forEach(button => {
        button.addEventListener('click', (e) => {
            // Kiểm tra chỉ khi IS_ADMIN = true mới thực hiện restock
            if (!IS_ADMIN) {
                alert("Bạn không có quyền restock!");
                return;
            } 

            const card = e.target.closest('.product-card');
            const item = card.dataset.item;
            const action = e.target.dataset.action;

            stockRef.child(item).transaction((current) => {
                let newCount = current || 0;
                if (action === 'add') {
                    newCount += 1;
                } else if (action === 'subtract') {
                    newCount = Math.max(0, newCount - 1); 
                }
                return newCount;
            });
        });
    });
});

// --- 4. Hiển thị Lịch sử Mua hàng ---
historyRef.orderByChild('timestamp').limitToLast(10).on('value', (snapshot) => {
    const historyList = document.getElementById('purchase-history');
    historyList.innerHTML = ''; 

    if (!snapshot.exists() || snapshot.numChildren() === 0) {
        historyList.innerHTML = '<li>Chưa có giao dịch nào.</li>';
        return;
    }

    snapshot.forEach((childSnapshot) => {
        const purchase = childSnapshot.val();
        const date = purchase.timestamp ? new Date(purchase.timestamp).toLocaleString() : 'N/A';
        
        const listItem = document.createElement('li');
        // Sử dụng innerHTML để hiển thị chữ in đậm
        listItem.innerHTML = `${date}: Đã mua **${purchase.item.toUpperCase()}** với giá **${purchase.price}** điểm.`;
        historyList.prepend(listItem); 
    });
});
