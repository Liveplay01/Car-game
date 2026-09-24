import GamePresentation
import UIKit
#if canImport(GoogleMobileAds)
import AppTrackingTransparency
import GoogleMobileAds
#endif

/// Rewarded ads for Standard chests (CLAUDE.md: Google AdMob). Uses Google's TEST ad unit
/// until the real one is set. Without the SDK (not resolvable in Playgrounds) the game
/// runs its placeholder ad instead, because `completion(false)` is never called then:
/// `GameModel` only sets this provider when the SDK is there (`isAvailable`).
final class AdMobRewardedAds: NSObject, AdProviding {
    /// Google's official rewarded test unit. Replace before the App Store.
    static let adUnitID = "ca-app-pub-3940256099942544/1712485313"

    static var isAvailable: Bool {
        #if canImport(GoogleMobileAds)
        Bundle.main.object(forInfoDictionaryKey: "GADApplicationIdentifier") != nil
        #else
        false
        #endif
    }

    #if canImport(GoogleMobileAds)
    private var rewarded: RewardedAd?
    private var started = false
    private var earned = false
    private var completion: ((Bool) -> Void)?
    #endif

    func prepare() {
        #if canImport(GoogleMobileAds)
        guard Self.isAvailable else { return }
        // Ask for tracking first (App Store rule), then start the SDK and load an ad.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            ATTrackingManager.requestTrackingAuthorization { _ in
                DispatchQueue.main.async {
                    MobileAds.shared.start(completionHandler: nil)
                    self.started = true
                    self.load()
                }
            }
        }
        #endif
    }

    func showRewardedAd(completion: @escaping (Bool) -> Void) {
        #if canImport(GoogleMobileAds)
        guard let ad = rewarded, let root = Self.rootViewController() else {
            // Nothing loaded yet: no chest this time, and load one for the next try.
            load()
            completion(false)
            return
        }
        earned = false
        self.completion = completion
        ad.fullScreenContentDelegate = self
        ad.present(from: root) { [weak self] in
            self?.earned = true
        }
        rewarded = nil
        #else
        completion(false)
        #endif
    }

    #if canImport(GoogleMobileAds)
    private func load() {
        guard started else { return }
        RewardedAd.load(with: Self.adUnitID, request: Request()) { [weak self] ad, _ in
            DispatchQueue.main.async { self?.rewarded = ad }
        }
    }
    #endif

    private static func rootViewController() -> UIViewController? {
        UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow }
            .first?.rootViewController
    }
}

#if canImport(GoogleMobileAds)
extension AdMobRewardedAds: FullScreenContentDelegate {
    /// The chest is given once the ad is closed, and only if it was watched to the end.
    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        completion?(earned)
        completion = nil
        load()
    }

    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        completion?(false)
        completion = nil
        load()
    }
}
#endif
