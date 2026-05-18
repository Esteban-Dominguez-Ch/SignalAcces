import 'dotenv/config';

export default {
  "expo": {
    "name": "SignalAcces",
    "slug": "SignalAcces",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "signalacces",
    "userInterfaceStyle": "automatic",
    "ios": {
      "icon": "./assets/expo.icon"
    },
    "android": {
      "package": "com.estebandominguezch.signalacces",
      "versionCode": 1,
      "compileSdkVersion": 34,
      "targetSdkVersion": 34,
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-image",
      "expo-sharing",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#208AEF",
          "android": {
            "image": "./assets/images/splash-icon.png",
            "imageWidth": 76
          }
        }
      ]
    ],
    "updates": {
      "url": "https://u.expo.dev/6acc8264-3f90-41e9-8a52-6401b4725bf2"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "apikey": process.env.API_KEY,
      "authDomain": process.env.AUTH_DOMAIN,
      "projectID": process.env.PROJECT_ID,
      "storageBucket": process.env.STORAGE_BUCKET,
      "messagingSenderId": process.env.MESSAGING_SENDER_ID,
      "appID": process.env.APP_ID,
      "eas": {
        "projectId": "6acc8264-3f90-41e9-8a52-6401b4725bf2"
      }
    }
  }
}
