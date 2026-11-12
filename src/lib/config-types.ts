export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface PublicRuntimeConfig {
  firebase: FirebaseWebConfig;
  youtube: {
    configured: boolean;
    region: string;
  };
  panel: {
    path: string;
  };
}

export const EMPTY_FIREBASE: FirebaseWebConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};