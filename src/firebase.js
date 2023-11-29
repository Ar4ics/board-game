// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyD0YAHOLRwTkUOqtOjZ98xhTWyN8paXy5A',
  authDomain: 'board-edb77.firebaseapp.com',
  projectId: 'board-edb77',
  storageBucket: 'board-edb77.appspot.com',
  messagingSenderId: '39269035834',
  appId: '1:39269035834:web:696ce7c03e8f63a9b26a03'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
