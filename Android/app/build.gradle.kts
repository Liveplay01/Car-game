plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "dev.gustaff.roundabout"
    compileSdk = 35

    defaultConfig {
        applicationId = "dev.gustaff.roundabout"
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "2.0.0"
        buildConfigField("String", "GAME_URL", "\"https://game.timing.love/?googleplaystore\"")
        buildConfigField("String", "GAME_HOST", "\"game.timing.love\"")
    }

    buildTypes {
        debug {
            // Google's demo rewarded unit: never show live ads while developing (AdMob policy).
            buildConfigField("String", "REWARDED_UNIT", "\"ca-app-pub-3940256099942544/5224354917\"")
        }
        release {
            buildConfigField("String", "REWARDED_UNIT", "\"ca-app-pub-8814590710596560/9161251590\"")
            isMinifyEnabled = false
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("com.google.android.gms:play-services-ads:23.6.0")
}
