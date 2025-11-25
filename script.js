// Thay thế thông tin cấu hình này bằng thông tin dự án Firebase của bạn
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // Ví dụ: "AIzaSyC0M..."
    authDomain: "skibidi-37b6d.firebaseapp.com",
    databaseURL: "https://skibidi-37b6d-default-rtdb.firebaseio.com",
    projectId: "skibidi-37b6d",
    storageBucket: "skibidi-37b6d.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Lấy tham chiếu đến Realtime Database
const database = firebase.database();
const stockRef = database.ref('stock');
const pointsRef = database.ref('user/admin/points'); // Giả định đây là điểm admin
const historyRef = database.ref('purchase_history');

// Biến giả định cho Admin View
// Trong ứng dụng thực tế, bạn cần xác thực người dùng để xác định vai trò
const IS_ADMIN = true; 

// --- 1. Hiển thị Điểm số, Tồn kho, và Admin Controls ---
stockRef.on('value', (snapshot) => {
    const stock = snapshot.val();
    
    // Cập nhật tồn kho Dough
    const doughCount = stock ? (stock.dough || 0) : 0;
    document.getElementById('stock-dough').textContent = doughCount;

    // Cập nhật tồn kho Portal
    const portalCount = stock ? (stock.portal || 0) : 0;
    document.getElementById('stock-portal').textContent = portalCount;

    // Bật/Tắt nút MUA dựa trên tồn kho
    document.querySelectorAll('.product-card').forEach(card => {
        const item = card.dataset.item;
        const count = stock ? (stock[item] || 0) : 0;
        const buyButton = card.querySelector('.btn-buy');
        
        buyButton.disabled = count <= 0;
    });
});

pointsRef.on('value', (snapshot) => {
    const points = snapshot.val();
    document.getElementById('user-points').textContent = points !== null ? points : 0;
});


document.addEventListener('DOMContentLoaded', () => {
    // Hiển thị/Ẩn Admin Controls
    if (IS_ADMIN) {
        document.querySelectorAll('.admin-controls').forEach(el => {
            el.style.display = 'inline-block';
        });
    } else {
        document.querySelectorAll('.admin-controls').forEach(el => {
            el.style.display = 'none';
        });
    }

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
                // 1. Giảm điểm của người dùng
                pointsRef.transaction((current) => {
                    return (current || 0) - price;
                });

                // 2. Giảm tồn kho
                stockRef.child(item).transaction((current) => {
                    return (current || 1) - 1; // Đảm bảo không xuống dưới 0
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

    // --- 3. Xử lý logic điều chỉnh tồn kho (Admin) ---
    document.querySelectorAll('.btn-stock-adjust').forEach(button => {
        button.addEventListener('click', (e) => {
            if (!IS_ADMIN) return; 

            const card = e.target.closest('.product-card');
            const item = card.dataset.item;
            const action = e.target.dataset.action;

            stockRef.child(item).transaction((current) => {
                let newCount = current || 0;
                if (action === 'add') {
                    newCount += 1;
                } else if (action === 'subtract') {
                    newCount = Math.max(0, newCount - 1); // Không cho phép tồn kho âm
                }
                return newCount;
            });
        });
    });
});

// --- 4. Hiển thị Lịch sử Mua hàng ---
historyRef.orderByChild('timestamp').limitToLast(10).on('value', (snapshot) => {
    const historyList = document.getElementById('purchase-history');
    historyList.innerHTML = ''; // Xóa lịch sử cũ

    if (!snapshot.exists() || snapshot.numChildren() === 0) {
        historyList.innerHTML = '<li>Chưa có giao dịch nào.</li>';
        return;
    }

    snapshot.forEach((childSnapshot) => {
        const purchase = childSnapshot.val();
        const date = purchase.timestamp ? new Date(purchase.timestamp).toLocaleString() : 'N/A';
        
        const listItem = document.createElement('li');
        listItem.textContent = `${date}: Đã mua **${purchase.item.toUpperCase()}** với giá **${purchase.price}** điểm.`;
        historyList.prepend(listItem); // Thêm vào đầu để hiển thị lịch sử mới nhất
    });
});
