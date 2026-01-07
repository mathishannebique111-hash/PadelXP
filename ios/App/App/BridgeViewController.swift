import Capacitor
import UIKit
import WebKit

class BridgeViewController: CAPBridgeViewController {
    
    private var safeAreaTopView: UIView?
    private var safeAreaBottomView: UIView?
    private var backgroundView: UIView?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Couleur bleue pour les pages joueur (#172554)
        let playerBlueColor = UIColor(red: 23.0/255.0, green: 37.0/255.0, blue: 84.0/255.0, alpha: 1.0)
        // Couleur noire par défaut
        let blackColor = UIColor.black
        
        // Par défaut, utiliser noir (sera mis à jour par JavaScript)
        self.view.backgroundColor = blackColor
        
        // S'assurer que la fenêtre principale a aussi un fond noir
        if let window = self.view.window {
            window.backgroundColor = blackColor
        }
        
        // Créer une vue de fond qui s'étend dans TOUTES les safe areas
        let bgView = UIView()
        bgView.backgroundColor = blackColor
        bgView.translatesAutoresizingMaskIntoConstraints = false
        self.view.insertSubview(bgView, at: 0)
        self.backgroundView = bgView
        
        NSLayoutConstraint.activate([
            bgView.topAnchor.constraint(equalTo: self.view.topAnchor),
            bgView.leadingAnchor.constraint(equalTo: self.view.leadingAnchor),
            bgView.trailingAnchor.constraint(equalTo: self.view.trailingAnchor),
            bgView.bottomAnchor.constraint(equalTo: self.view.bottomAnchor)
        ])
        
        // Créer des vues pour les safe areas en haut et en bas
        if #available(iOS 11.0, *) {
            // Vue pour la safe area du haut
            let topView = UIView()
            topView.backgroundColor = blackColor
            topView.translatesAutoresizingMaskIntoConstraints = false
            self.view.addSubview(topView)
            self.safeAreaTopView = topView
            
            NSLayoutConstraint.activate([
                topView.topAnchor.constraint(equalTo: self.view.topAnchor),
                topView.leadingAnchor.constraint(equalTo: self.view.leadingAnchor),
                topView.trailingAnchor.constraint(equalTo: self.view.trailingAnchor),
                topView.bottomAnchor.constraint(equalTo: self.view.safeAreaLayoutGuide.topAnchor)
            ])
            
            // Vue pour la safe area du bas
            let bottomView = UIView()
            bottomView.backgroundColor = blackColor
            bottomView.translatesAutoresizingMaskIntoConstraints = false
            self.view.addSubview(bottomView)
            self.safeAreaBottomView = bottomView
            
            NSLayoutConstraint.activate([
                bottomView.topAnchor.constraint(equalTo: self.view.safeAreaLayoutGuide.bottomAnchor),
                bottomView.leadingAnchor.constraint(equalTo: self.view.leadingAnchor),
                bottomView.trailingAnchor.constraint(equalTo: self.view.trailingAnchor),
                bottomView.bottomAnchor.constraint(equalTo: self.view.bottomAnchor)
            ])
        }
        
        // Rendre la WebView transparente pour que le fond soit visible
        self.webView?.backgroundColor = UIColor.clear
        self.webView?.isOpaque = false
        self.webView?.scrollView.backgroundColor = UIColor.clear
        
        // Étendre la WebView sous les safe areas (y compris la barre de statut)
        if #available(iOS 11.0, *) {
            self.webView?.scrollView.contentInsetAdjustmentBehavior = .never
            self.additionalSafeAreaInsets = UIEdgeInsets.zero
        }
        
        // Étendre la vue principale sous la barre de statut
        self.edgesForExtendedLayout = .all
        
        // Écouter les messages JavaScript pour changer la couleur
        self.setupColorListener()
    }
    
    private func setupColorListener() {
        // Écouter les messages depuis JavaScript via Capacitor
        // La WebView est déjà configurée par Capacitor, on ajoute juste notre handler
        // On doit le faire après que la WebView soit chargée
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            if let webView = self.webView as? WKWebView {
                webView.configuration.userContentController.add(self, name: "updateSafeAreaColor")
            }
        }
    }
    
    private func updateSafeAreaColor(_ colorHex: String) {
        let color: UIColor
        if colorHex == "#172554" || colorHex == "172554" {
            // Bleu pour les pages joueur
            color = UIColor(red: 23.0/255.0, green: 37.0/255.0, blue: 84.0/255.0, alpha: 1.0)
        } else {
            // Noir par défaut
            color = UIColor.black
        }
        
        DispatchQueue.main.async {
            self.view.backgroundColor = color
            self.backgroundView?.backgroundColor = color
            self.safeAreaTopView?.backgroundColor = color
            self.safeAreaBottomView?.backgroundColor = color
            
            if let window = self.view.window {
                window.backgroundColor = color
            }
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // S'assurer que la fenêtre et la vue ont la bonne couleur
        let currentColor = self.view.backgroundColor ?? UIColor.black
        if let window = self.view.window {
            window.backgroundColor = currentColor
        }
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        // S'assurer que la couleur est toujours correcte après l'apparition
        let currentColor = self.view.backgroundColor ?? UIColor.black
        if let window = self.view.window {
            window.backgroundColor = currentColor
        }
    }
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    
    override var prefersStatusBarHidden: Bool {
        return false
    }
}

// Extension pour recevoir les messages JavaScript
extension BridgeViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "updateSafeAreaColor", let colorHex = message.body as? String {
            self.updateSafeAreaColor(colorHex)
        }
    }
}


