# Automatische projectassistent — testversie

Deze branch is een geïsoleerd prototype. **Niet naar main samenvoegen** voordat Access en preview zijn getest.

## Wat werkt na configuratie
- Kies per project een privé- of openbare GitHub-repository.
- Bevestig de aanmaak expliciet.
- POST /api/projects maakt via GitHub een lege repository met README (auto_init) aan.
- Cloudflare Access JWT wordt cryptografisch geverifieerd; e-mailadres en audience worden gecontroleerd.
- Geheimen blijven server-side.

## Cloudflare instellen
1. Maak een Cloudflare Access-app voor **de gehele preview-hostnaam**, inclusief /api/projects. Sta uitsluitend je eigen identiteit toe. Zonder Access kan het formulier de API niet veilig gebruiken.
2. Stel de volgende Worker secrets/variabelen in op **alleen de testomgeving**:
   - GITHUB_TOKEN (secret): fine-grained GitHub token met repository creation bevoegdheid. Let op: GitHub kan voor repositorycreatie een classic token met 'public_repo'/'repo' of GitHub App user token vereisen; geef uitsluitend noodzakelijke rechten en bewaar het nooit in HTML.
   - CF_ACCESS_TEAM_DOMAIN (variable): <team>.cloudflareaccess.com
   - CF_ACCESS_AUD (variable): Access application AUD tag
   - ADMIN_EMAIL (variable): je exacte Access e-mailadres
3. Stel preview command in op `npx wrangler preview` en laat de configuratie uit wrangler.jsonc gebruiken.
4. Test eerst met een wegwerpnaam. Controleer op GitHub of privacy-instelling klopt.
5. Controleer dat anonieme toegang een 401/403 geeft en dat geen token zichtbaar is in HTML of browserconsole.

## Nog niet geïmplementeerd
- GitHub-repository automatisch vullen met een website.
- GitHub-Cloudflare integratie / automatische Cloudflare Worker aanmaak.
- Persistente registratie en synchronisatie van projectkaarten.
- Opruimen/rollback van een half geslaagde workflow.

Een repository aanmaken kan pas nadat de eigenaar bovenstaande instellingen heeft geconfigureerd. De UI toont fout 503 als deze ontbreken. GitHub-repositories worden niet zonder bevestiging aangemaakt.

## Veiligheidsgrenzen
- Geen Cloudflare API-token of GitHub-token in client JavaScript.
- Voor productie een afzonderlijke Cloudflare Access-app en minimale GitHub App-permissies aanbevolen.
- Geen automatische merge naar main.
