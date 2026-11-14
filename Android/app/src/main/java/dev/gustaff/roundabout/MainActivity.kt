package dev.gustaff.roundabout

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import java.util.concurrent.atomic.AtomicBoolean

/** The game's page in a WebView, plus the one native thing a page cannot do: AdMob's rewarded ad. */
class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private val main = Handler(Looper.getMainLooper())
    private val adsStarted = AtomicBoolean(false)
    @Volatile private var ad: RewardedAd? = null
    private var loading = false
    private var retry = 0

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.systemBars())
        }

        web = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0B0D10"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            addJavascriptInterface(AdBridge(), "AndroidAds")
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (request.url.host == BuildConfig.GAME_HOST) return false
                    startActivity(Intent(Intent.ACTION_VIEW, request.url))
                    return true
                }
            }
        }
        setContentView(web)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else finish()
            }
        })

        web.loadUrl(startUrl(intent))
        startAds()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        web.loadUrl(startUrl(intent))
    }

    /** A crew link keeps its path; every other start opens the game. */
    private fun startUrl(intent: Intent): String {
        val link: Uri? = intent.data
        if (link?.host != BuildConfig.GAME_HOST) return BuildConfig.GAME_URL
        val query = if (link.getQueryParameter("googleplaystore") != null) "" else "${if (link.query == null) "?" else "&"}googleplaystore"
        return link.toString() + query
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
    }

    override fun onPause() {
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    /** Asks for consent where the law wants it (EEA, UK), then starts the SDK once. */
    private fun startAds() {
        val consent = UserMessagingPlatform.getConsentInformation(this)
        consent.requestConsentInfoUpdate(
            this,
            ConsentRequestParameters.Builder().build(),
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(this) { initAds(consent) }
            },
            { initAds(consent) },
        )
        initAds(consent)
    }

    private fun initAds(consent: ConsentInformation) {
        if (!consent.canRequestAds() || !adsStarted.compareAndSet(false, true)) return
        MobileAds.initialize(this) { loadAd() }
    }

    private fun loadAd() {
        if (loading || ad != null) return
        loading = true
        RewardedAd.load(
            this,
            BuildConfig.REWARDED_UNIT,
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(loaded: RewardedAd) {
                    loading = false
                    retry = 0
                    ad = loaded
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    loading = false
                    retry = minOf(retry + 1, 6)
                    main.postDelayed({ loadAd() }, 5_000L shl retry)
                }
            },
        )
    }

    private fun answer(outcome: String) {
        web.evaluateJavascript("window.onAdMobResult && window.onAdMobResult('$outcome')", null)
    }

    private fun showAd(): Boolean {
        val current = ad ?: return false
        ad = null
        var earned = false
        current.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                answer(if (earned) "watched" else "dismissed")
                loadAd()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                answer("unavailable")
                loadAd()
            }
        }
        current.show(this) { earned = true }
        return true
    }

    /** `window.AndroidAds`, read by `Web/src/ui/admob.ts`. */
    private inner class AdBridge {
        @JavascriptInterface
        fun isReady(): Boolean = ad != null

        @JavascriptInterface
        fun show(): Boolean {
            var shown = false
            val done = java.util.concurrent.CountDownLatch(1)
            runOnUiThread {
                shown = showAd()
                done.countDown()
            }
            done.await()
            return shown
        }
    }
}
