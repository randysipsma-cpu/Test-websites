# FORMA3D — beveiligde orderbackend (voorbereiding)

Deze bestanden staan alleen op de testbranch. De bestaande afrekenpagina blijft **demonstratie zonder opslag of verzending van persoonsgegevens**. Er is nog geen echte checkout-integratie.

## Vereisten voor activering
1. Controleer eerst of de Cloudflare Pages-build de rootmap `functions/` publiceert. Bij een uitsluitend statische GitHub/Pages-configuratie wordt de API niet actief.
2. Maak een **aparte D1-testdatabase** en voer `database/forma3d-schema.sql` uit.
3. Koppel D1-binding `FORMA3D_DB` uitsluitend aan de bedoelde testomgeving.
4. Maak een Cloudflare Access-applicatie voor `/api/forma3d/*` en beperk toegang tot expliciet toegestane beheeraccounts. Stel de servervariabelen `FORMA3D_ACCESS_TEAM_DOMAIN` (bijv. `https://team.cloudflareaccess.com`) en `FORMA3D_ACCESS_AUD` (Access application AUD-tag) in. Geen secrets in GitHub.
5. Verifieer dat ongeautoriseerde GET/PATCH 401 opleveren en dat de database zonder binding 503 oplevert. Test Access-beleid en D1 uitsluitend op de preview.
6. Pas na die controles het dashboard aan om via de beveiligde API orders te lezen/bij te werken. Een echt bestelproces vereist daarnaast een publiek order-inname-endpoint met server-side prijsvalidatie, anti-spam, privacybeleid, dataminimalisatie en retentiebeleid; **dat endpoint bestaat nog niet**.

De API heeft nu alleen **GET** (max. 100 orders) en **PATCH** (statuswijziging) en accepteert geen nieuwe orders. Verifieert Cloudflare Access JWT RS256-handtekening, issuer, audience en vervaltijd. Zonder juiste configuratie weigert de API toegang.
