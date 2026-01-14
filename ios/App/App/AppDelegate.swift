import UIKit
import Capacitor
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

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

@objc(BridgeViewController)
public class BridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {
    
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
            print("PadelXP Native: Page is ready, showing WebView")
            DispatchQueue.main.async {
                UIView.animate(withDuration: 0.2) {
                    self.webView?.alpha = 1.0
                }
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
        self.view.backgroundColor = UIColor(red: 0.09, green: 0.145, blue: 0.33, alpha: 1.0)
        
        // NE PLUS UTILISER de flag HasLaunchedBefore
        // Laisser Next.js gérer la redirection basée sur l'état d'authentification réel
        // - Si connecté → /home
        // - Si pas connecté → /player/signup
        // - Si déconnecté volontairement → /login (via un flag dans le storage)
        
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
            webView.backgroundColor = UIColor(red: 0.09, green: 0.145, blue: 0.33, alpha: 1.0)
            webView.isOpaque = false
            webView.scrollView.contentInsetAdjustmentBehavior = .never
            
            // CACHER la WebView au départ - le LaunchScreen iOS reste visible
            webView.alpha = 0.0
        }
    }
}
