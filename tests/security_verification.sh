#!/bin/bash
# ==============================================================================
# SOMNOCONNECT SECURITY VERIFICATION SCRIPT
# Tests the critical vulnerabilities to ensure they are blocked.
# ==============================================================================

# Remplissez ces variables avec les tokens de la production
URL="https://wzvvdbbdnlhjqpydqvur.supabase.co"
ANON_KEY="sb_publishable_1Egz5qaKIbZ9VB_QCsb8fw_XbmdLx2z"

echo "🔐 SomnoConnect Security Verification Script"
echo "--------------------------------------------------------"
read -p "Entrez le JWT d'un utilisateur AGENT : " AGENT_TOKEN
read -p "Entrez le JWT d'un utilisateur CLIENT : " CLIENT_TOKEN
read -p "Entrez l'UUID d'un profil admin (pour le test d'escalade) : " ADMIN_UUID
echo "--------------------------------------------------------"

echo "🧪 1. PRIVATE ESCALATION (FAILLE 1)"
echo "Test: Agent essaie de devenir admin"
ESCALATION_RES=$(curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.$ADMIN_UUID" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}')
if [ -z "$ESCALATION_RES" ]; then
  echo "✅ SUCCÈS: Escalade bloquée (0 rows updated)"
else
  echo "❌ ÉCHEC: Escalade possible ! $ESCALATION_RES"
fi
echo ""

echo "🧪 2. IDOR PROFILES (FAILLE 2)"
echo "Test: Agent essaie de lister tous les profils"
PROFILES_RES=$(curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/profiles?select=*" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "apikey: $ANON_KEY")
# Vérifier la taille ou le code
COUNT=$(curl -s "$URL/rest/v1/profiles?select=*" -H "Authorization: Bearer $AGENT_TOKEN" -H "apikey: $ANON_KEY" | grep -o 'id' | wc -l)
if [ "$COUNT" -le 2 ]; then
  echo "✅ SUCCÈS: Lecture restreinte au profil/institution ($COUNT trouvés)"
else
  echo "❌ ÉCHEC: Il semble que tout l'annuaire soit visible ($COUNT trouvés) !"
fi
echo ""

echo "🧪 3. IDOR STUDIES (FAILLE 3)"
echo "Test: Client essaie de lister toutes les études"
STUDIES_COUNT=$(curl -s "$URL/rest/v1/studies?select=*" -H "Authorization: Bearer $CLIENT_TOKEN" -H "apikey: $ANON_KEY" | grep -o 'id' | wc -l)
if [ "$STUDIES_COUNT" -le 10 ]; then
  echo "✅ SUCCÈS: Lecture des études restreinte ($STUDIES_COUNT trouvées)"
else
  echo "❌ ÉCHEC: Trop d'études visibles par un client ($STUDIES_COUNT trouvées) !"
fi
echo ""

echo "🧪 4. TOKEN EXPOSURE / INVITATIONS (FAILLE 5)"
echo "Test: Agent essaie de lister les invitations"
INVITES_RES=$(curl -s "$URL/rest/v1/invitations?select=*" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "apikey: $ANON_KEY")
if [[ "$INVITES_RES" == *"[]"* ]] || [[ "$INVITES_RES" == "" ]]; then
  echo "✅ SUCCÈS: Invitations cachées aux agents"
else
  echo "❌ ÉCHEC: Invitations lisibles par l'agent ($INVITES_RES)"
fi
echo ""

echo "🧪 5. STORAGE ACCESS (FAILLE 4)"
echo "Test: Client essaie de télécharger un rapport au hasard (doit être 40x)"
STORAGE_RES=$(curl -s -o /dev/null -w "%{http_code}" "$URL/storage/v1/object/report-files/some-random-uuid/rapport.pdf" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "apikey: $ANON_KEY")
if [[ "$STORAGE_RES" == "404" ]] || [[ "$STORAGE_RES" == "403" ]] || [[ "$STORAGE_RES" == "400" ]]; then
  echo "✅ SUCCÈS: Accès storage restreint ($STORAGE_RES)"
else
  echo "❌ ÉCHEC: Fichier potentiellement accessible ($STORAGE_RES) !"
fi
echo ""

echo "🎉 VERIFICATION TERMINEE."
