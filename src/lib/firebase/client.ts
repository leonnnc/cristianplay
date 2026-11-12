import { sanitizeLibrary } from "@/lib/library-data";
import type { AppUser, LibraryData } from "@/lib/types";
import type { FirebaseWebConfig } from "@/lib/config-types";

type FirebaseApp = import("firebase/app").FirebaseApp;
type FirebaseUser = import("firebase/auth").User;

let runtimeConfig: FirebaseWebConfig | null = null;

const ENV_CONFIG: FirebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || "",
};

function normalize(config: FirebaseWebConfig | null | undefined): FirebaseWebConfig {
  const base = config ?? EMPTY();
  return {
    apiKey: (base.apiKey ?? "").trim(),
    authDomain: (base.authDomain ?? "").trim(),
    projectId: (base.projectId ?? "").trim(),
    storageBucket: (base.storageBucket ?? "").trim(),
    messagingSenderId: (base.messagingSenderId ?? "").trim(),
    appId: (base.appId ?? "").trim(),
  };
}

function EMPTY(): FirebaseWebConfig {
  return {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  };
}

export function configureFirebase(config: FirebaseWebConfig | null): void {
  const next = normalize(config);
  const prev = runtimeConfig;
  if (JSON.stringify(prev) === JSON.stringify(next)) return;
  runtimeConfig = next;
  void import("firebase/app")
    .then(({ getApps, deleteApp }) => Promise.all(getApps().map((app) => deleteApp(app))))
    .catch(() => {});
  appPromise = null;
}

export function getFirebaseConfig(): FirebaseWebConfig {
  if (runtimeConfig) {
    const env = ENV_CONFIG;
    return {
      apiKey: runtimeConfig.apiKey || env.apiKey,
      authDomain: runtimeConfig.authDomain || env.authDomain,
      projectId: runtimeConfig.projectId || env.projectId,
      storageBucket: runtimeConfig.storageBucket || env.storageBucket,
      messagingSenderId: runtimeConfig.messagingSenderId || env.messagingSenderId,
      appId: runtimeConfig.appId || env.appId,
    };
  }
  return ENV_CONFIG;
}

export function isFirebaseConfigured(): boolean {
  const cfg = getFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

let appPromise: Promise<FirebaseApp> | null = null;

async function getFirebaseApp(): Promise<FirebaseApp> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase no está configurado.");
  }
  if (!appPromise) {
    const cfg = getFirebaseConfig();
    appPromise = (async () => {
      const { initializeApp, getApps, getApp } = await import("firebase/app");
      if (getApps().length > 0) return getApp();
      return initializeApp({
        apiKey: cfg.apiKey,
        authDomain: cfg.authDomain,
        projectId: cfg.projectId,
        storageBucket: cfg.storageBucket || undefined,
        messagingSenderId: cfg.messagingSenderId || undefined,
        appId: cfg.appId,
      });
    })().catch((error: unknown) => {
      appPromise = null;
      throw error;
    });
  }
  return appPromise;
}

function toAppUser(user: FirebaseUser): AppUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

export async function watchAuth(
  callback: (user: AppUser | null) => void,
): Promise<() => void> {
  const [{ getAuth, onAuthStateChanged }, app] = await Promise.all([
    import("firebase/auth"),
    getFirebaseApp(),
  ]);

  return onAuthStateChanged(
    getAuth(app),
    (user) => callback(user ? toAppUser(user) : null),
    (error) => {
      console.error("[firebase] auth state error", error);
      callback(null);
    },
  );
}

export async function signInWithGoogle(): Promise<AppUser> {
  const [{ getAuth, GoogleAuthProvider, signInWithPopup }, app] =
    await Promise.all([import("firebase/auth"), getFirebaseApp()]);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(getAuth(app), provider);
  return toAppUser(credential.user);
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<AppUser> {
  const [{ getAuth, createUserWithEmailAndPassword, updateProfile }, app] =
    await Promise.all([import("firebase/auth"), getFirebaseApp()]);
  const auth = getAuth(app);
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }
  return toAppUser(credential.user);
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AppUser> {
  const [{ getAuth, signInWithEmailAndPassword }, app] = await Promise.all([
    import("firebase/auth"),
    getFirebaseApp(),
  ]);
  const credential = await signInWithEmailAndPassword(getAuth(app), email, password);
  return toAppUser(credential.user);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const [{ getAuth, sendPasswordResetEmail }, app] = await Promise.all([
    import("firebase/auth"),
    getFirebaseApp(),
  ]);
  await sendPasswordResetEmail(getAuth(app), email);
}

export async function signOutFirebase(): Promise<void> {
  const [{ getAuth, signOut }, app] = await Promise.all([
    import("firebase/auth"),
    getFirebaseApp(),
  ]);
  await signOut(getAuth(app));
}

export async function loadRemoteLibrary(
  uid: string,
): Promise<LibraryData | null> {
  const [{ getFirestore, doc, getDoc }, app] = await Promise.all([
    import("firebase/firestore"),
    getFirebaseApp(),
  ]);
  const snapshot = await getDoc(
    doc(getFirestore(app), "users", uid, "library", "main"),
  );
  if (!snapshot.exists()) return null;
  return sanitizeLibrary(snapshot.data());
}

export async function saveRemoteLibrary(
  uid: string,
  library: LibraryData,
): Promise<void> {
  const [{ getFirestore, doc, setDoc }, app] = await Promise.all([
    import("firebase/firestore"),
    getFirebaseApp(),
  ]);

  const clean = JSON.parse(
    JSON.stringify({ ...library, updatedAt: Date.now() }),
  ) as LibraryData;

  await setDoc(doc(getFirestore(app), "users", uid, "library", "main"), clean);
}

export function describeAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Cerraste la ventana de Google antes de completar el acceso.";
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana emergente. Permite las ventanas emergentes e inténtalo de nuevo.";
    case "auth/unauthorized-domain":
      return "Este dominio no está autorizado en Firebase Authentication.";
    case "auth/operation-not-allowed":
      return "El acceso con Google no está habilitado en Firebase Authentication.";
    case "auth/network-request-failed":
      return "Sin conexión con Firebase. Revisa tu red e inténtalo de nuevo.";
    case "auth/email-already-in-use":
      return "Ese correo ya está registrado. Inicia sesión.";
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Intenta más tarde.";
    default:
      return "No se pudo completar la operación. Revisa la configuración.";
  }
}