function doPost(e) {
    const output = { status: 'error', message: 'Invalid request' };

    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;

        if (action === 'register') {
            return ContentService.createTextOutput(JSON.stringify(handleRegister(data)));
        } else if (action === 'setup_password') {
            return ContentService.createTextOutput(JSON.stringify(handleSetupPassword(data)));
        } else if (action === 'login') {
            return ContentService.createTextOutput(JSON.stringify(handleLogin(data)));
        } else if (action === 'get_products') {
            return ContentService.createTextOutput(JSON.stringify(handleGetProducts()));
        } else if (action === 'place_order') {
            return ContentService.createTextOutput(JSON.stringify(handlePlaceOrder(data)));
        } else if (action === 'update_profile') {
            return ContentService.createTextOutput(JSON.stringify(handleUpdateProfile(data)));
        } else if (action === 'get_order_history') {
            return ContentService.createTextOutput(JSON.stringify(handleGetOrderHistory(data)));
        }

    } catch (err) {
        output.message = err.toString();
    }

    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}

// Configuration
const SHEET_ID = '1AW6oNU-lfHsSRfSchMM1I5oJZQ2XJxBQ9Bl_BTwmYOI'; // Target Spreadsheet ID
const USERS_SHEET_NAME = '会員情報';
const PRODUCTS_SHEET_NAME = '商品管理'; // Changed to '商品管理' per user request
const ORDERS_SHEET_NAME = '注文履歴';
const SHOP_NOTIFICATION_EMAIL = 'excia2021@icloud.com';

// Helper to get Spreadsheet (Works for both Bound and Standalone scripts)
function getSpreadsheet() {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        if (ss) return ss;
    } catch (e) {
        // Fallback to ID if not bound
    }
    return SpreadsheetApp.openById(SHEET_ID);
}

// ----------------------------------------------------------------
// MANUAL SETUP FUNCTION (手動セットアップ用)
// ----------------------------------------------------------------
// この関数を選択して「実行」することで、強制的にシートを作成・整形します
function initialSetup() {
    try {
        const ss = getSpreadsheet();

        // ==================================================
        // 1. Users Sheet Setup (会員情報)
        // ==================================================
        let userSheet = ss.getSheetByName(USERS_SHEET_NAME);
        if (!userSheet) {
            userSheet = ss.insertSheet(USERS_SHEET_NAME);
        }

        // Headers
        const userHeaders = ['ID', 'Email', 'PasswordHash', 'Status', 'Name', 'Salon', 'Position', 'Address', 'Mobile', 'Token', 'CreatedAt'];
        userSheet.getRange(1, 1, 1, userHeaders.length).setValues([userHeaders]);

        // Formatting
        userSheet.getRange(1, 1, 1, userHeaders.length).setFontWeight('bold').setBackground('#e3f2fd').setBorder(true, true, true, true, true, true);
        userSheet.setFrozenRows(1);
        userSheet.setColumnWidth(1, 50);  // ID
        userSheet.setColumnWidth(2, 200); // Email
        userSheet.setColumnWidth(3, 50);  // Hash (Hide usually)
        userSheet.setColumnWidth(4, 80);  // Status
        userSheet.setColumnWidth(5, 120); // Name
        userSheet.setColumnWidth(6, 150); // Salon
        userSheet.setColumnWidth(11, 150);// Date


        // ==================================================
        // 2. Products Sheet Setup (商品管理)
        // ==================================================
        let productSheet = ss.getSheetByName(PRODUCTS_SHEET_NAME);
        if (!productSheet) {
            productSheet = ss.insertSheet(PRODUCTS_SHEET_NAME);
        }

        // Set Headers 
        const prodHeaders = ['No', 'カテゴリ', '商品名', '定価(税込)', '中岡商会販売価格(税込)', 'JANコード', '画像URL'];
        productSheet.getRange(1, 1, 1, prodHeaders.length).setValues([prodHeaders]);

        // Formatting
        productSheet.getRange(1, 1, 1, prodHeaders.length).setFontWeight('bold')
            .setBackground('#f3f3f3')
            .setBorder(true, true, true, true, true, true)
            .setHorizontalAlignment('center');

        // Style Price Columns (Red Text for Nakaoka Price)
        productSheet.getRange('E:E').setFontColor('#D32F2F').setFontWeight('bold');

        productSheet.setFrozenRows(1);
        productSheet.setColumnWidth(1, 40);  // No
        productSheet.setColumnWidth(2, 120); // Category
        productSheet.setColumnWidth(3, 300); // Name
        productSheet.setColumnWidth(4, 100); // Price
        productSheet.setColumnWidth(5, 150); // Nakaoka Price
        productSheet.setColumnWidth(7, 300); // Image URL

        // Auto-add sample data if empty
        if (productSheet.getLastRow() <= 1) {
            const sampleProducts = [
                ['001', 'OLCAN', 'OLCAN スターターキット', 45000, 39800, '4580000000001', 'http://b-pilot.jp/wp-content/uploads/2026/02/0B78EE88-D232-45BE-8B23-256AB60AF755.jpeg'],
                ['002', '店販商品', 'リペアシャンプーDX 500ml', 3800, 2400, '4580000000002', ''],
                ['003', '店販商品', 'モイスチャートリートメントEX 500g', 4200, 2800, '4580000000003', '']
            ];
            productSheet.getRange(2, 1, sampleProducts.length, sampleProducts[0].length).setValues(sampleProducts);
            console.log('サンプル商品データを追加しました');
        }


        // ==================================================
        // 3. Orders Sheet Setup (注文履歴)
        // ==================================================
        let orderSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
        if (!orderSheet) {
            orderSheet = ss.insertSheet(ORDERS_SHEET_NAME);
        }

        // Headers
        const orderHeaders = ['OrderID', 'Date', 'Status', 'Salon', 'Name', 'Email', 'Items', 'TotalAmount'];
        orderSheet.getRange(1, 1, 1, orderHeaders.length).setValues([orderHeaders]);

        // Formatting
        orderSheet.getRange(1, 1, 1, orderHeaders.length).setFontWeight('bold').setBackground('#fff3e0').setBorder(true, true, true, true, true, true);
        orderSheet.setFrozenRows(1);
        orderSheet.setColumnWidth(1, 100); // OrderID
        orderSheet.setColumnWidth(2, 150); // Date
        orderSheet.setColumnWidth(3, 80);  // Status
        orderSheet.setColumnWidth(7, 300); // Items
        orderSheet.setColumnWidth(8, 100); // Total

        console.log('全シートの最適化・セットアップが完了しました');
    } catch (e) {
        console.log('エラーが発生しました: ' + e.toString());
    }
}

// ----------------------------------------------------------------
// ACTIONS
// ----------------------------------------------------------------

function handleRegister(data) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(USERS_SHEET_NAME);

    // Safety check if sheet missing (redundant if setup ran, but good for safety)
    if (!sheet) {
        sheet = ss.insertSheet(USERS_SHEET_NAME);
        sheet.appendRow(['ID', 'Email', 'PasswordHash', 'Status', 'Name', 'Salon', 'Position', 'Address', 'Mobile', 'Token', 'CreatedAt']);
    }

    const email = data.email.trim();

    // Check Duplicate
    const users = sheet.getDataRange().getValues();
    for (let i = 1; i < users.length; i++) {
        if (users[i][1] === email) {
            return { status: 'error', message: 'このメールアドレスは既に登録されています。' };
        }
    }

    const id = Utilities.getUuid();
    const token = Utilities.getUuid(); // Setup token
    const status = 'pending';
    const now = new Date();

    sheet.appendRow([
        id,
        email,
        '', // Password Hash (Empty initially)
        status,
        data.name,
        data.salon,
        data.position,
        data.address,
        data.mobile,
        token,
        now
    ]);

    // Send Verification Email
    const subject = '【中岡商会】会員登録の手続きをお願いします';
    const shopUrl = 'http://b-pilot.jp/?page_id=31'; // Target Page
    const setupLink = `${shopUrl}&mode=setup&token=${token}`;

    const body = `
${data.name} 様

中岡商会 オンラインショップへのお申し込みありがとうございます。
以下のリンクをクリックして、パスワードを設定し登録を完了してください。

■パスワード設定リンク
${setupLink}

※このリンクの有効期限は24時間です。
※お心当たりのない場合は、本メールを破棄してください。

--------------------------------------------------
中岡商会
`;

    GmailApp.sendEmail(email, subject, body);

    return { status: 'success', message: '登録確認メールを送信しました。メール内のリンクからパスワード設定を行ってください。' };
}

function handleSetupPassword(data) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET_NAME);
    const users = sheet.getDataRange().getValues();
    const token = data.token;
    const password = data.password;

    if (!token || !password) return { status: 'error', message: '無効なデータです' };

    let rowIndex = -1;
    for (let i = 1; i < users.length; i++) {
        if (users[i][9] === token && users[i][3] === 'pending') {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex === -1) {
        return { status: 'error', message: '無効なトークンか、既に登録が完了しています。' };
    }

    const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
    let hexString = '';
    for (let j = 0; j < signature.length; j++) {
        let val = (signature[j] + 256) % 256;
        let hex = val.toString(16);
        hexString += (hex.length == 1 ? '0' + hex : hex);
    }

    sheet.getRange(rowIndex, 3).setValue(hexString); // PasswordHash
    sheet.getRange(rowIndex, 4).setValue('active'); // Status
    sheet.getRange(rowIndex, 10).setValue(''); // Clear Token

    return { status: 'success', message: 'パスワード設定が完了しました。ログインしてください。' };
}

function handleLogin(data) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET_NAME);
    if (!sheet) return { status: 'error', message: 'システムエラー: Usersシートが見つかりません' };

    const users = sheet.getDataRange().getValues();
    const email = data.email;
    const password = data.password;

    const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
    let hexString = '';
    for (let j = 0; j < signature.length; j++) {
        let val = (signature[j] + 256) % 256;
        let hex = val.toString(16);
        hexString += (hex.length == 1 ? '0' + hex : hex);
    }

    let user = null;
    for (let i = 1; i < users.length; i++) {
        if (users[i][1] === email && users[i][2] === hexString && users[i][3] === 'active') {
            user = {
                id: users[i][0],
                email: users[i][1],
                name: users[i][4],
                salon: users[i][5],
                position: users[i][6],
                address: users[i][7],
                mobile: users[i][8]
            };
            break;
        }
    }

    if (user) {
        return { status: 'success', user: user };
    } else {
        return { status: 'error', message: 'メールアドレスまたはパスワードが間違っています。' };
    }
}

function handleGetProducts() {
    try {
        const ss = getSpreadsheet();
        const sheet = ss.getSheetByName(PRODUCTS_SHEET_NAME);
        if (!sheet) return { status: 'error', message: `シート「${PRODUCTS_SHEET_NAME}」が見つかりません。シート名を変更していませんか？` };

        const rawData = sheet.getDataRange().getValues();
        const products = [];

        // A:No, B:カテゴリ, C:商品名, D:定価, E:中岡商会販売価格, F:JAN, G:画像URL
        for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row[2]) continue; // Skip if Name is empty
            products.push({
                no: row[0],
                category: row[1], // New: Category
                name: row[2],
                price: row[3],
                discount_price: row[4],
                jan: row[5],
                image: row[6] || ''
            });
        }

        return { status: 'success', products: products };
    } catch (e) {
        return { status: 'error', message: 'スプレッドシートを開けませんでした。IDを確認してください: ' + e.toString() };
    }
}

function handlePlaceOrder(data) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(ORDERS_SHEET_NAME);

    if (!sheet) {
        sheet = ss.insertSheet(ORDERS_SHEET_NAME);
        sheet.appendRow(['OrderID', 'Date', 'Status', 'Salon', 'Name', 'Email', 'Items', 'TotalAmount']);
    }

    const orderId = Utilities.getUuid();
    const now = new Date();

    // Format items for spreadsheet
    let itemsStr = '';
    if (data.items && Array.isArray(data.items)) {
        itemsStr = data.items.map(i => `${i.name} x${i.qty}`).join(', ');
    }

    sheet.appendRow([
        orderId,
        now,
        'ordered',
        data.user.salon,
        data.user.name,
        data.user.email,
        itemsStr,
        data.total
    ]);

    // ----------------------------------------------------------------
    // Email Notification Logic
    // ----------------------------------------------------------------
    const subject = `【注文受信】${data.user.salon} ${data.user.name} 様より`;

    const body = `
中岡商会 御中
(※自動送信メール)

以下の注文を受け付けました。
スプレッドシートの「Orders」シートにも保存されています。

--------------------------------------------------
【注文ID】 ${orderId}

【注文者情報】
サロン名: ${data.user.salon}
お名前: ${data.user.name}
メール: ${data.user.email} (ユーザーID: ${data.user.id || 'N/A'})

【注文内容】
${data.items.map(i => `・${i.name}  x ${i.qty}`).join('\n')}

--------------------------------------------------
合計金額: ¥${data.total.toLocaleString()}
--------------------------------------------------

※この後、お客様へSMSで決済URLを送信してください。
`;

    // 1. Send to Shop
    GmailApp.sendEmail(SHOP_NOTIFICATION_EMAIL, subject, body);

    // 2. Send Confirmation to User
    const userSubject = '【中岡商会】ご注文ありがとうございます';
    const userBody = `
${data.user.name} 様

中岡商会 オンラインショップをご利用いただきありがとうございます。
以下の内容でご注文を承りました。

--------------------------------------------------
【注文内容】
${data.items.map(i => `・${i.name}  x ${i.qty}`).join('\n')}

合計金額: ¥${data.total.toLocaleString()}
--------------------------------------------------

この後、ご登録の携帯電話番号へSMS（ショートメッセージ）にて
「お支払い用URL」をお送りいたします。
お支払いの確認ができ次第、商品を発送させていただきます。

今後ともよろしくお願いいたします。

--------------------------------------------------
中岡商会
`;

    GmailApp.sendEmail(data.user.email, userSubject, userBody);

    return { status: 'success', message: 'Order placed successfully', orderId: orderId };
}

function handleGetOrderHistory(data) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(ORDERS_SHEET_NAME);

    if (!sheet) return { status: 'success', orders: [] };

    const rows = sheet.getDataRange().getValues();
    // Headers: OrderID, Date, Status, Salon, Name, Email, Items, TotalAmount
    // Index:   0,       1,    2,      3,     4,    5,     6,     7

    const email = data.email;
    const orders = [];

    // Skip header row (i=1)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[5] === email) {
            orders.push({
                orderId: row[0],
                date: row[1],
                status: row[2],
                items: row[6],
                total: row[7]
            });
        }
    }

    // Sort by date desc
    orders.sort((a, b) => new Date(b.date) - new Date(a.date));

    return { status: 'success', orders: orders };
}

function handleUpdateProfile(data) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET_NAME);
    const users = sheet.getDataRange().getValues();
    const id = data.id;

    let rowIndex = -1;
    for (let i = 1; i < users.length; i++) {
        if (users[i][0] === id) {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex === -1) {
        return { status: 'error', message: 'ユーザーが見つかりません。' };
    }

    // Update Columns (Indices are 0-based in array, 1-based in getRange)
    // 0:ID, 1:Email, ..., 4:Name, 5:Salon, 6:Position, 7:Address, 8:Mobile

    sheet.getRange(rowIndex, 5).setValue(data.name);     // Name
    sheet.getRange(rowIndex, 6).setValue(data.salon);    // Salon
    sheet.getRange(rowIndex, 7).setValue(data.position); // Position
    sheet.getRange(rowIndex, 8).setValue(data.address);  // Address
    sheet.getRange(rowIndex, 9).setValue(data.mobile);   // Mobile

    // Return updated user object
    const updatedUser = {
        id: id,
        email: users[rowIndex - 1][1], // Keep existing email
        name: data.name,
        salon: data.salon,
        position: data.position,
        address: data.address,
        mobile: data.mobile
    };

    return { status: 'success', message: '会員情報を更新しました。', user: updatedUser };
}
