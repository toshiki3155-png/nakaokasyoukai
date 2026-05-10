const functions = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');

admin.initializeApp();
const db = admin.firestore();

/**
 * LINE Messaging API Push Message トリガー
 * lineNotifications の新規作成、または status が pending に更新された時に実行
 */
exports.sendLineMessage = functions.region('asia-northeast1').firestore
  .document('lineNotifications/{docId}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return;

    const data = change.after.data();
    const docRef = change.after.ref;
    const beforeStatus = change.before.exists ? change.before.data().status : null;
    const beforeRetryCount = change.before.exists ? (change.before.data().retryCount || 0) : 0;
    const afterRetryCount = data.retryCount || 0;

    if (data.status !== 'pending') return;
    if (beforeStatus === 'pending' && beforeRetryCount === afterRetryCount) return;

    // Firestore の config/site からトークンを取得
    const configSnap = await db.collection('config').doc('site').get();
    const config = configSnap.exists ? configSnap.data() : {};

    const channelAccessToken = config.lineChannelAccessToken;
    const userId = config.lineUserId;

    if (!channelAccessToken || !userId) {
      console.warn('LINE Messaging API の設定が未登録です (lineChannelAccessToken, lineUserId)');
      await docRef.update({ status: 'skipped', reason: 'no_config' });
      return;
    }

    const body = JSON.stringify({
      to: userId,
      messages: [
        {
          type: 'text',
          text: data.message
        }
      ]
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.line.me',
        path: '/v2/bot/message/push',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${channelAccessToken}`,
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = https.request(options, (res) => {
        let resBody = '';
        res.on('data', chunk => resBody += chunk);
        res.on('end', async () => {
          if (res.statusCode === 200) {
            await docRef.update({
              status: 'sent',
              sentAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('LINE Push 送信成功:', data.orderId);
            resolve();
          } else {
            const errMsg = `LINE API エラー ${res.statusCode}: ${resBody}`;
            console.error(errMsg);
            await docRef.update({
              status: 'error',
              error: errMsg,
              errorAt: admin.firestore.FieldValue.serverTimestamp()
            });
            reject(new Error(errMsg));
          }
        });
      });

      req.on('error', async (err) => {
        console.error('HTTPS エラー:', err);
        await docRef.update({
          status: 'error',
          error: err.message,
          errorAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
        reject(err);
      });

      req.write(body);
      req.end();
    });
  });
