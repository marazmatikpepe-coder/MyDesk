const admin = require('firebase-admin');

// The service account JSON is passed in as a GitHub Actions secret (see README-reminders.md)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://mydesk-f83cc-default-rtdb.firebaseio.com',
});

const db = admin.database();

async function main() {
  const now = Date.now();
  const snap = await db.ref('users').once('value');
  const users = snap.val() || {};
  const jobs = [];

  for (const uid of Object.keys(users)) {
    const u = users[uid] || {};
    const tasksRaw = u.tasks;
    if (!tasksRaw) continue;
    const tasks = Array.isArray(tasksRaw) ? tasksRaw : Object.values(tasksRaw);

    const tokensObj = u.fcmTokens || {};
    const tokens = Object.keys(tokensObj);
    if (!tokens.length) continue;

    const fired = u.firedReminders || {};

    for (const t of tasks) {
      if (!t || !t.reminderOn || t.done || !t.due) continue;
      const dueMs = new Date(`${t.due}T${t.time || '00:00'}`).getTime();
      if (Number.isNaN(dueMs)) continue;

      const remindAt = dueMs - (t.reminderOffset || 0) * 60000;
      const key = `${t.id}_${remindAt}`;

      // 6-minute window: covers GitHub Actions' occasional scheduling delay
      if (remindAt <= now && remindAt > now - 6 * 60000 && !fired[key]) {
        const body =
          (t.description || '').replace(/\[\[s:[a-zA-Z0-9]+\]\]/g, '').trim() ||
          'Напоминание о задаче';

        jobs.push(
          admin
            .messaging()
            .sendEachForMulticast({ tokens, notification: { title: t.title, body } })
            .then(async (res) => {
              await Promise.all(
                res.responses.map((r, i) => {
                  if (
                    !r.success &&
                    r.error &&
                    r.error.code === 'messaging/registration-token-not-registered'
                  ) {
                    return db.ref(`users/${uid}/fcmTokens/${tokens[i]}`).remove();
                  }
                  return null;
                })
              );
              return db.ref(`users/${uid}/firedReminders/${key}`).set(true);
            })
            .catch((err) => console.error('reminder send failed', uid, key, err))
        );
      }
    }
  }

  await Promise.all(jobs);
  console.log('Reminder check complete:', new Date().toISOString());
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
