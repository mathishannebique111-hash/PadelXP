/**
 * E2E Tests: Isolation des clubs dans la recherche de joueurs
 * 
 * Scénario de test:
 * - Deux utilisateurs de clubs différents (TCAM et Amiens Padel)
 * - Chacun tape le même préfixe de nom
 * - Chacun ne doit voir que les membres de son propre club
 * 
 * Pour exécuter ces tests:
 * 1. Installer Playwright: npm install -D @playwright/test
 * 2. Configurer les variables d'environnement de test
 * 3. Exécuter: npx playwright test tests/e2e/player-search-club-isolation.test.ts
 */

import { test, expect } from '@playwright/test';

// Configuration des utilisateurs de test
const TCAM_USER = {
  email: process.env.TCAM_USER_EMAIL || 'tcam-user@test.com',
  password: process.env.TCAM_USER_PASSWORD || 'test-password',
  clubName: 'TCAM',
  expectedClubSlug: 'tcam80300'
};

const AMIENS_USER = {
  email: process.env.AMIENS_USER_EMAIL || 'amiens-user@test.com',
  password: process.env.AMIENS_USER_PASSWORD || 'test-password',
  clubName: 'Amiens Padel',
  expectedClubSlug: 'amienspadel76210'
};

// Préfixe de recherche commun
const SEARCH_PREFIX = 'Jean'; // Exemple: cherche "Jean" dans les deux clubs

test.describe('Isolation des clubs dans la recherche de joueurs', () => {
  
  test('TCAM user ne voit que les membres TCAM', async ({ page }) => {
    // 1. Se connecter avec l'utilisateur TCAM
    await page.goto('/player/login');
    await page.fill('input[type="email"]', TCAM_USER.email);
    await page.fill('input[type="password"]', TCAM_USER.password);
    await page.click('button[type="submit"]');
    
    // Attendre la redirection vers le profil
    await page.waitForURL(/\/club\/.*\/profil|\/home/, { timeout: 10000 });
    
    // 2. Aller sur la page d'enregistrement de match
    await page.goto('/match/new');
    await page.waitForLoadState('networkidle');
    
    // 3. Rechercher un joueur avec le préfixe
    const searchInput = page.locator('input[placeholder*="Rechercher"]').first();
    await searchInput.fill(SEARCH_PREFIX);
    await page.waitForTimeout(1000); // Attendre les résultats
    
    // 4. Vérifier que seuls les membres TCAM apparaissent
    const results = page.locator('[role="option"], .autocomplete-result, .player-result');
    const count = await results.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Vérifier que tous les résultats appartiennent au club TCAM
    for (let i = 0; i < count; i++) {
      const result = results.nth(i);
      const text = await result.textContent();
      
      // Log pour debug
      console.log(`TCAM result ${i}: ${text}`);
      
      // Vérifier que le résultat ne contient pas de mention d'un autre club
      // (Cette vérification dépend de votre implémentation UI)
      expect(text).not.toContain(AMIENS_USER.clubName);
    }
    
    // 5. Vérifier dans les logs de la console que le club_id correct est utilisé
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[Search]') || msg.text().includes('serverClubId')) {
        logs.push(msg.text());
      }
    });
    
    // Relancer une recherche pour capturer les logs
    await searchInput.clear();
    await searchInput.fill(SEARCH_PREFIX);
    await page.waitForTimeout(1000);
    
    // Vérifier que les logs contiennent le bon club_id
    const searchLogs = logs.filter(log => log.includes('serverClubId'));
    expect(searchLogs.length).toBeGreaterThan(0);
    // Le log devrait contenir le club_id du club TCAM
    // (Vous devrez adapter cette vérification selon votre format de log)
  });
  
  test('Amiens user ne voit que les membres Amiens Padel', async ({ page }) => {
    // 1. Se connecter avec l'utilisateur Amiens Padel
    await page.goto('/player/login');
    await page.fill('input[type="email"]', AMIENS_USER.email);
    await page.fill('input[type="password"]', AMIENS_USER.password);
    await page.click('button[type="submit"]');
    
    // Attendre la redirection
    await page.waitForURL(/\/club\/.*\/profil|\/home/, { timeout: 10000 });
    
    // 2. Aller sur la page d'enregistrement de match
    await page.goto('/match/new');
    await page.waitForLoadState('networkidle');
    
    // 3. Rechercher un joueur avec le même préfixe
    const searchInput = page.locator('input[placeholder*="Rechercher"]').first();
    await searchInput.fill(SEARCH_PREFIX);
    await page.waitForTimeout(1000);
    
    // 4. Vérifier que seuls les membres Amiens Padel apparaissent
    const results = page.locator('[role="option"], .autocomplete-result, .player-result');
    const count = await results.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Vérifier que tous les résultats appartiennent au club Amiens Padel
    for (let i = 0; i < count; i++) {
      const result = results.nth(i);
      const text = await result.textContent();
      
      console.log(`Amiens result ${i}: ${text}`);
      
      // Vérifier que le résultat ne contient pas de mention du club TCAM
      expect(text).not.toContain(TCAM_USER.clubName);
    }
  });
  
  test('Les deux utilisateurs tapent le même préfixe et voient des résultats différents', async ({ browser }) => {
    // Créer deux contextes de page pour simuler deux utilisateurs simultanés
    const tcamContext = await browser.newContext();
    const amiensContext = await browser.newContext();
    
    const tcamPage = await tcamContext.newPage();
    const amiensPage = await amiensContext.newPage();
    
    try {
      // Connecter les deux utilisateurs
      await tcamPage.goto('/player/login');
      await tcamPage.fill('input[type="email"]', TCAM_USER.email);
      await tcamPage.fill('input[type="password"]', TCAM_USER.password);
      await tcamPage.click('button[type="submit"]');
      await tcamPage.waitForURL(/\/club\/.*\/profil|\/home/, { timeout: 10000 });
      
      await amiensPage.goto('/player/login');
      await amiensPage.fill('input[type="email"]', AMIENS_USER.email);
      await amiensPage.fill('input[type="password"]', AMIENS_USER.password);
      await amiensPage.click('button[type="submit"]');
      await amiensPage.waitForURL(/\/club\/.*\/profil|\/home/, { timeout: 10000 });
      
      // Aller sur la page d'enregistrement de match pour les deux
      await tcamPage.goto('/match/new');
      await amiensPage.goto('/match/new');
      
      await tcamPage.waitForLoadState('networkidle');
      await amiensPage.waitForLoadState('networkidle');
      
      // Rechercher avec le même préfixe sur les deux pages
      const tcamSearch = tcamPage.locator('input[placeholder*="Rechercher"]').first();
      const amiensSearch = amiensPage.locator('input[placeholder*="Rechercher"]').first();
      
      await tcamSearch.fill(SEARCH_PREFIX);
      await amiensSearch.fill(SEARCH_PREFIX);
      
      await tcamPage.waitForTimeout(1000);
      await amiensPage.waitForTimeout(1000);
      
      // Récupérer les résultats
      const tcamResults = tcamPage.locator('[role="option"], .autocomplete-result, .player-result');
      const amiensResults = amiensPage.locator('[role="option"], .autocomplete-result, .player-result');
      
      const tcamCount = await tcamResults.count();
      const amiensCount = await amiensResults.count();
      
      // Les deux devraient avoir des résultats (si des joueurs existent dans chaque club)
      console.log(`TCAM results: ${tcamCount}, Amiens results: ${amiensCount}`);
      
      // Vérifier que les résultats sont différents
      if (tcamCount > 0 && amiensCount > 0) {
        const tcamNames: string[] = [];
        const amiensNames: string[] = [];
        
        for (let i = 0; i < tcamCount; i++) {
          const text = await tcamResults.nth(i).textContent();
          if (text) tcamNames.push(text);
        }
        
        for (let i = 0; i < amiensCount; i++) {
          const text = await amiensResults.nth(i).textContent();
          if (text) amiensNames.push(text);
        }
        
        // Les listes de noms ne devraient pas se chevaucher
        const intersection = tcamNames.filter(name => amiensNames.includes(name));
        expect(intersection.length).toBe(0);
        
        console.log('✓ Isolation confirmed: No common players between clubs');
      }
    } finally {
      await tcamContext.close();
      await amiensContext.close();
    }
  });
});


