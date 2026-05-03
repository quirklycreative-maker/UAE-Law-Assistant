import { db } from "../lib/firebase";
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";

// The UAE Personal Data Protection Law (Federal Decree Law No 45 of 2021) 
// mandates that personal data must not be kept longer than necessary for the 
// purposes for which it is processed. For chat history/support systems lacking 
// an explicit commercial retention requirement, 30 days for archival and 
// 180 days (6 months) for permanent deletion is a safe default to manage storage
// and uphold privacy compliance.
const ARCHIVE_DAYS = 30;
const DELETE_MONTHS = 6;
const DELETE_DAYS = DELETE_MONTHS * 30;

export async function cleanupOldConversations(userId: string) {
  try {
    const path = "ai_conversations";
    const q = query(
      collection(db, path),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;
    
    const now = new Date();
    const batch = writeBatch(db);
    let count = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Use createdAt, fallback to updatedAt, fallback to epoch
      const createdAt = data.createdAt?.toDate() || data.updatedAt?.toDate() || new Date(0);
      const diffTime = Math.abs(now.getTime() - createdAt.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= DELETE_DAYS) {
        // Delete older than 6 months
        batch.delete(docSnap.ref);
        count++;
      } else if (diffDays >= ARCHIVE_DAYS && !data.isArchived) {
        // Archive older than 30 days
        batch.update(docSnap.ref, { isArchived: true });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Cleaned up ${count} old conversations based on UAE PDPL limits.`);
    }
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}
