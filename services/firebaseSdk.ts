// Importaciones actualizadas para Firebase 9.x y uuid 10.0.0
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import {
    createUserWithEmailAndPassword,
    getAuth,
    initializeAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from 'firebase/auth';
import {
    ref as databaseRef,
    getDatabase,
    limitToLast,
    off,
    onChildAdded,
    push,
    query,
    serverTimestamp,
} from 'firebase/database';
import {
    getDownloadURL,
    getStorage,
    ref as storageRef,
    uploadBytesResumable,
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';


const config = {
    apiKey: 'AIzaSyAe0J9gADJCNDM9_2gRZbOfSNUYcHgOFrk',
    authDomain: 'caecus-dev.firebaseapp.com',
    databaseURL: 'https://caecus-dev.firebaseio.com',
    projectId: 'caecus-dev',
    storageBucket: 'caecus-dev.appspot.com',
    messagingSenderId: '782668069657',
    appId: '1:782668069657:web:db1c7a12f7bb1ca6892388',
};

const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence;

class FirebaseSdk {
    app: any;
    auth: any;
    database: any;
    storage: any;
    messageQuery: any;
    messageCallback: any;

    constructor() {
        if (!getApps().length) {
            this.app = initializeApp(config);
            console.log('Firebase inicializado')
        } else {
            this.app = getApp();
        }
            this.auth = initializeAuth(this.app, {
            persistence: reactNativePersistence(AsyncStorage),
        });
        this.auth = getAuth(this.app);
        this.database = getDatabase(this.app);
        this.storage = getStorage(this.app);
    }

    login = async (user: any, success_callback: any, failed_callback: any) => {
        try {
            const output = await signInWithEmailAndPassword(
                this.auth,
                user.email,
                '12345678'
            );
            success_callback(output);
            console.log('loging desde firebase');
        } catch (error) {
            failed_callback(error);
        }
    };

    observeAuth = () => onAuthStateChanged(this.auth, this.onAuthStateChanged);

    onAuthStateChanged = (user: any) => {
        if (!user) {
            try {
                this.login(
                    user, 
                    () => {}, 
                    (error: any) => console.log('Failed:' + error.message)
                );
            } catch (error) {
                console.log('Failed:' + error.message);
            }
        } else {
            console.log('Reusing auth...');
        }
    };

    createAccount = async (user: any) => {
        try {
            await createUserWithEmailAndPassword(
                this.auth,
                user.email,
                '12345678'
            );
            return 'ok';
        } catch (error) {
            return 'exists';
        }
    };

    uploadImage = async (uri: any) => {
        console.log('got image to upload. uri:' + uri);
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const storageReference = storageRef(
                this.storage,
                `avatar/${uuidv4()}`
            );
            const task = uploadBytesResumable(storageReference, blob);

            return new Promise((resolve, reject) => {
                task.on(
                    'state_changed',
                    () => {},
                    (error) => { reject(error) },
                    async () => {
                        const downloadURL = await getDownloadURL(task.snapshot.ref);
                        resolve(downloadURL);
                    }
                );
            });
        } catch (err: any) {
            console.log('uploadImage try/catch error: ' + err.message);
        }
    };

    updateAvatar = (url: any) => {
        const userf = this.auth.currentUser;
        if (userf != null) {
            updateProfile(userf, { photoURL: url }).then(
                function () {
                    console.log('Updated avatar successfully. url:' + url);
                },
                function (error) {
                    console.warn('Error update avatar.');
                }
            );
        } else {
            console.log("can't update avatar, user is not logged in.");
        }
    };

    onLogout = (user: any) => {
        signOut(this.auth)
            .then(function () {
                console.log('Sign-out successful.');
            })
            .catch(function (error) {
                console.log('An error happened when signing out');
            });
    };

    get uid() {
        return (this.auth.currentUser || {}).uid;
    }

    get ref() {
        return databaseRef(this.database, `messages`);
    }

    parse = (snapshot: any) => {
        const { timestamp: numberStamp, text, user, myUser } = snapshot.val();
        const { key: id } = snapshot;
        const { key: _id } = snapshot; // needed for giftedchat
        const timestamp = new Date(numberStamp);

        const message = {
            id,
            _id,
            timestamp,
            text,
            user,
            myUser,
        };
        return message;
    };

    refOn = (callback: any) => {
        this.messageQuery = query(this.ref, limitToLast(20));
        this.messageCallback = (snapshot: any) => callback(this.parse(snapshot));
        onChildAdded(this.messageQuery, this.messageCallback);
    };

    get timestamp() {
        return serverTimestamp();
    }

    // Enviar el mensaje al Backend
    send = (messages: any, myUser: any) => {
        for (let i = 0; i < messages.length; i++) {
        const { text, user } = messages[i];
        const message = {
            text,
            user,
            myUser,
            createdAt: this.timestamp,
        };
        console.log('lib', message);
        push(this.ref, message);
        }
        return messages;
    };

    refOff() {
        if (this.messageQuery && this.messageCallback) {
            off(this.messageQuery, 'child_added', this.messageCallback);
        }
    }
}

const firebaseSdk = new FirebaseSdk();
export default firebaseSdk;
