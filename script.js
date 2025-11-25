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

// Lấy tham chiếu
const database = firebase.database();
const auth = firebase.auth();
const stockRef = database.ref('stock');
const historyRef = database.ref('purchase_history');

let pointsRef = null; // Sẽ được gán sau khi đăng nhập

// --- Hàm Cập nhật UI sau khi Đăng nhập/Đăng xuất ---
function updateUI(user) {
    const authSection = document.getElementById('auth-section');
    const mainApp = document.getElementById('main-app');
    const userEmailEl = document.getElementById('user-email');
    const adminControls = document.querySelectorAll('.admin-controls');

    if (user) {
        // Đã đăng nhập
        authSection.style.display = 'none';
        mainApp.style.display = 'block';
        userEmailEl.textContent = user.email;

        // Gán lại pointsRef DỰA TRÊN UID CỦA NGƯỜI DÙNG
        pointsRef = database.ref(`users/${user.uid}/points`);

        // Tự động thêm điểm ban đầu nếu đây là lần đầu người dùng đăng nhập
        pointsRef.once('value', snapshot => {
            if (!snapshot.exists()) {
                pointsRef.set(1000); // Admin mới đăng ký sẽ có 1000 điểm
            }
        });

        // Lắng nghe điểm số của người dùng hiện tại
        pointsRef.on('value', (snapshot) => {
            const points = snapshot.val();
            document.getElementById('user-points').textContent = points !== null ? points : 0;
        });

        // Chỉ hiển thị controls nếu UID khớp với UID Admin đã được thiết lập Rules
        // (Trong Rules sẽ cần phải định nghĩa Admin UID)
        // Hiện tại, ta tạm hiển thị nếu người dùng đã đăng nhập (Giả định họ là Admin)
        adminControls.forEach(el => {
            el.style.display = 'inline-block';
        });

    } else {
        // Đã đăng xuất
        authSection.style.display = 'block';
        mainApp.style.display = 'none';
        adminControls.forEach(el => {
            el.style.display = 'none';
        });
        if (pointsRef) {
             pointsRef.off(); // Ngừng lắng nghe điểm
        }
    }
}

// --- Xử lý Đăng ký, Đăng nhập, Đăng xuất ---
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const messageEl = document.getElementById('auth-message');

    // Sự kiện Đăng ký
    document.getElementById('btn-signup').addEventListener('click', () => {
        auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
            .then(() => {
                messageEl.textContent = 'Đăng ký thành công! Vui lòng Đăng nhập.';
            })
            .catch(error => {
                messageEl.textContent = `Lỗi Đăng ký: ${error.message}`;
            });
    });

    // Sự kiện Đăng nhập
    document.getElementById('btn-login').addEventListener('click', () => {
        auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
            .then(() => {
                messageEl.textContent = 'Đăng nhập thành công!';
            })
            .catch(error => {
                messageEl.textContent = `Lỗi Đăng nhập: ${error.message}`;
            });
    });
    
    // Sự kiện Đăng xuất
    document.getElementById('btn-logout').addEventListener('click', () => {
        auth.signOut();
    });

    // Lắng nghe trạng thái Authentication (quan trọng nhất)
    auth.onAuthStateChanged(user => {
        updateUI(user);
    });

    // --- Lắng nghe Tồn kho (Chạy ngay cả khi chưa đăng nhập) ---
    stockRef.on('value', (snapshot) => {
        const stock = snapshot.val();
        
        const doughCount = stock && stock.dough !== undefined ? stock.dough : 0;
        document.getElementById('stock-dough').textContent = doughCount;

        const portalCount = stock && stock.portal !== undefined ? stock.portal : 0;
        document.getElementById('stock-portal').textContent = portalCount;

        document.querySelectorAll('.product-card').forEach(card => {
            const item = card.dataset.item;
            const stockCountEl = document.getElementById(`stock-${item}`);
            const count = parseInt(stockCountEl.textContent);
            const buyButton = card.querySelector('.btn-buy');
            buyButton.disabled = count <= 0;
        });
    });

    // --- Lắng nghe Lịch sử (Chạy ngay cả khi chưa đăng nhập) ---
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
            listItem.innerHTML = `${date}: Đã mua **${purchase.item.toUpperCase()}** với giá **${purchase.price}** điểm.`;
            historyList.prepend(listItem); 
        });
    });

    // --- 4. Xử lý logic MUA hàng ---
    document.querySelectorAll('.btn-buy').forEach(button => {
        button.addEventListener('click', (e) => {
            const user = auth.currentUser;
            if (!user) {
                alert("Vui lòng đăng nhập để thực hiện giao dịch!");
                return;
            }

            const card = e.target.closest('.product-card');
            const item = card.dataset.item;
            const price = parseInt(card.dataset.price);
            const currentPoints = parseInt(document.getElementById('user-points').textContent);
            const stockCountEl = document.getElementById(`stock-${item}`);
            let currentStock = parseInt(stockCountEl.textContent);

            if (currentPoints >= price && currentStock > 0) {
                // 1. Giảm điểm của người dùng (dùng transaction an toàn)
                database.ref(`users/${user.uid}/points`).transaction((current) => {
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
                    uid: user.uid,
                    email: user.email,
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

    // --- 5. Xử lý logic điều chỉnh tồn kho (Chỉ Admin đã đăng nhập) ---
    document.querySelectorAll('.btn-stock-adjust').forEach(button => {
        button.addEventListener('click', (e) => {
            const user = auth.currentUser;
            // Kiểm tra: Phải đăng nhập VÀ UID phải là Admin (sẽ được kiểm soát bởi Rules)
            if (!user) {
                alert("Bạn phải đăng nhập để thực hiện điều chỉnh kho hàng.");
                return;
            }

            const card = e.target.closest('.product-card');
            const item = card.dataset.item;
            const action = e.target.dataset.action;

            // Lệnh ghi này sẽ bị chặn nếu Rules không cho phép UID hiện tại ghi vào /stock
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
