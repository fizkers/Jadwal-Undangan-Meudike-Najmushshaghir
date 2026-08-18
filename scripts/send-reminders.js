const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAndSendReminders() {
  const now = new Date();
  
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibTime = new Date(now.getTime() + wibOffset);

  const schedulesSnap = await db.collection('jadwal_2026')
    .where('isCompleted', '==', false)
    .get();

  const tokensSnap = await db.collection('fcm_tokens').get();
  const tokens = [];
  tokensSnap.forEach(doc => {
    if (doc.data().token) {
      tokens.push(doc.data().token);
    }
  });

  if (tokens.length === 0) {
    console.log("Tidak ada token terdaftar.");
    return;
  }

  schedulesSnap.forEach(async (docSnap) => {
    const item = docSnap.data();
    if (!item.date || !item.exactTime) return;

    const eventDate = new Date(`${item.date}T${item.exactTime}:00+07:00`);
    const diffInMinutes = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60));

    let title = "";
    let body = "";
    let notificationTag = "";

    if (diffInMinutes >= 115 && diffInMinutes <= 125) {
      title = "Pengingat Jadwal Meudike (H-2 Jam) 🕌";
      body = `Perhatian: Acara dzikir di ${item.place} akan dimulai 2 jam lagi pukul ${item.exactTime} WIB. Mohon bersiap-siap.`;
      notificationTag = `h2-${docSnap.id}`;
    } else if (diffInMinutes >= 55 && diffInMinutes <= 65) {
      title = "Pengingat Jadwal Meudike (H-1 Jam) 🕌";
      body = `Pengingat Terakhir: Acara dzikir di ${item.place} akan dimulai 1 jam lagi pukul ${item.exactTime} WIB.`;
      notificationTag = `h1-${docSnap.id}`;
    }

    if (title && body) {
      const message = {
        notification: {
          title: title,
          body: body
        },
        data: {
          tag: notificationTag,
          scheduleId: docSnap.id
        },
        tokens: tokens
      };

      try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Sukses mengirim notifikasi untuk ${item.place}:`, response.successCount);
      } catch (err) {
        console.error(`Gagal mengirim notifikasi untuk ${item.place}:`, err);
      }
    }
  });
}

checkAndSendReminders().catch(console.error);
