import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : undefined);
}

export const db = getFirestore();

export const getUserTransacoes = async (uid, filtros = {}) => {
  let query = db.collection(`users/${uid}/transacoes`).where('deleted', '!=', true);

  if (filtros.mesAno) {
    const [ano, mes] = filtros.mesAno.split('-');
    query = query
      .where('data', '>=', `${ano}-${mes}-01`)
      .where('data', '<=', `${ano}-${mes}-31`);
  }

  const snap = await query.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
