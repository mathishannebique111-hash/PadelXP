import Capacitor
import UIKit

class BridgeViewController: CAPBridgeViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Rendre la WebView transparente
        self.webView?.backgroundColor = UIColor.clear
        self.webView?.isOpaque = false
        self.webView?.scrollView.backgroundColor = UIColor.clear
        
        // Étendre la WebView sous les safe areas
        if #available(iOS 11.0, *) {
            self.webView?.scrollView.contentInsetAdjustmentBehavior = .never
        }
    }
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
}


