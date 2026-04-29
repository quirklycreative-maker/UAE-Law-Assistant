import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export type UsageType = 'gemini_query' | 'legal_search' | 'document_generation' | 'support_query';

export async function logUsage(type: UsageType, status: 'success' | 'error' = 'success', tokens?: number) {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'usage_stats'), {
      type,
      status,
      tokens: tokens || 0,
      userId: user?.uid || 'anonymous',
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}
