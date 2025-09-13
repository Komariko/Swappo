// firebase/loadItems.js
import { collection, getDocs } from "firebase/firestore";
import { db } from './config';

export async function loadItems() {
  try {
    const querySnapshot = await getDocs(collection(db, "items"));
    const items = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    return items;
  } catch (err) {
    console.error("โหลดรายการล้มเหลว:", err);
    return [];
  }
}
