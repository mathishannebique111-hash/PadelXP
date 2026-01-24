import UIKit
import Capacitor
import UserNotifications
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if let window = self.window {
            window.backgroundColor = UIColor(red: 0.09, green: 0.145, blue: 0.33, alpha: 1.0)
        }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

@objc(BridgeViewController)
public class BridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {
    
    // Native splash overlay that stays on top until JS signals ready
    private var splashOverlay: UIView?
    
    public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "updateSafeAreaColor", let colorHex = message.body as? String {
            print("PadelXP Native: Updating safe area color to \(colorHex)")
            DispatchQueue.main.async {
                let color = self.colorFromHex(colorHex)
                self.view.backgroundColor = color
                self.webView?.backgroundColor = color
                self.webView?.isOpaque = false
            }
        } else if message.name == "hideSplash" {
            print("PadelXP Native: Page is ready, hiding splash overlay")
            DispatchQueue.main.async {
                // Fade out and remove the splash overlay
                UIView.animate(withDuration: 0.3, animations: {
                    self.splashOverlay?.alpha = 0.0
                }, completion: { _ in
                    self.splashOverlay?.removeFromSuperview()
                    self.splashOverlay = nil
                })
            }
        }
    }
    
    private func colorFromHex(_ hex: String) -> UIColor {
        var cString: String = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if cString.hasPrefix("#") { cString.remove(at: cString.startIndex) }
        if cString.count != 6 { return .black }
        var rgbValue: UInt64 = 0
        Scanner(string: cString).scanHexInt64(&rgbValue)
        return UIColor(
            red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
            alpha: 1.0
        )
    }
    
    public required init?(coder: NSCoder) {
        super.init(coder: coder)
    }
    
    public override init(nibName nibNameOrNil: String?, bundle nibBundleOrNil: Bundle?) {
        super.init(nibName: nibNameOrNil, bundle: nibBundleOrNil)
    }
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        
        // Background color matching the splash
        let splashColor = UIColor(red: 0.027, green: 0.082, blue: 0.329, alpha: 1.0)
        self.view.backgroundColor = splashColor
        
        // Create native splash overlay that covers everything
        createSplashOverlay()
        
        print("PadelXP Native: App launched, letting Next.js handle auth-based routing")
        
        let scriptSource = """
        (function() {
            document.documentElement.classList.add('is-app');
            // La page racine "/" fera la vérification d'auth et redirigera vers la bonne page
        })();
        """
        
        let script = WKUserScript(source: scriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        
        if let webView = self.webView {
            webView.configuration.userContentController.addUserScript(script)
            webView.configuration.userContentController.add(self, name: "updateSafeAreaColor")
            webView.configuration.userContentController.add(self, name: "hideSplash")
            webView.backgroundColor = splashColor
            webView.isOpaque = false
            webView.scrollView.contentInsetAdjustmentBehavior = .never
            
            // WebView is now visible (no alpha 0), the splash overlay covers it
        }
    }
    
    private func createSplashOverlay() {
        // Create the overlay
        let overlay = UIView(frame: self.view.bounds)
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        overlay.backgroundColor = UIColor(red: 0.027, green: 0.082, blue: 0.329, alpha: 1.0)
        
        // Add the logo
        if let logoImage = UIImage(named: "Splash") {
            let logoView = UIImageView(image: logoImage)
            logoView.contentMode = .scaleAspectFit
            logoView.translatesAutoresizingMaskIntoConstraints = false
            overlay.addSubview(logoView)
            
            // Center the logo
            NSLayoutConstraint.activate([
                logoView.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
                logoView.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
                logoView.widthAnchor.constraint(equalToConstant: 560),
                logoView.heightAnchor.constraint(equalToConstant: 300)
            ])
        }
        
        // Add to view hierarchy on top of everything
        self.view.addSubview(overlay)
        self.splashOverlay = overlay
        
        print("PadelXP Native: Splash overlay created")
    }
}
