import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

export type UsageType = 'gemini_query' | 'legal_search' | 'document_generation' | 'support_query';

export async function logUsage(type: UsageType, status: 'success' | 'error' = 'success', tokens?: number) {
  const path = 'usage_stats';
  try {
    const user = auth.currentUser;
    if (!user) return; // Rules require signed in

    await addDoc(collection(db, path), {
      type,
      status,
      tokens: tokens || 0,
      userId: user.uid,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
